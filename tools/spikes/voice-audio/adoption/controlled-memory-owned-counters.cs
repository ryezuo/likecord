using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class Va3bOwnedCounters {
  [StructLayout(LayoutKind.Sequential)]
  public struct Counters {
    public uint cb, PageFaultCount;
    public UIntPtr PeakWorkingSetSize, WorkingSetSize, QuotaPeakPagedPoolUsage, QuotaPagedPoolUsage;
    public UIntPtr QuotaPeakNonPagedPoolUsage, QuotaNonPagedPoolUsage, PagefileUsage, PeakPagefileUsage;
    public UIntPtr PrivateUsage, PrivateWorkingSetSize;
    public ulong SharedCommitUsage;
  }
  // Toolhelp needs the complete native structure size, but executable-name bytes
  // are opaque padding: never marshalled as names, accessed, returned or persisted.
  // Only parent/PID edges are used transiently to find the owned browser tree.
  [StructLayout(LayoutKind.Sequential)]
  struct Entry {
    public uint size, usage, id;
    public UIntPtr heap;
    public uint module, threads, parent;
    public int priority;
    public uint flags;
    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 520)] public byte[] opaquePadding;
  }
  [StructLayout(LayoutKind.Sequential)]
  struct PerformanceInformation {
    public uint cb;
    public UIntPtr commitTotal, commitLimit, commitPeak, physicalTotal, physicalAvailable;
    public UIntPtr systemCache, kernelTotal, kernelPaged, kernelNonpaged, pageSize;
    public uint handles, processes, threads;
  }
  public sealed class ProcessRow { public int Id; public int Parent; public ulong CreationFileTime; }
  public sealed class MemoryRow { public ulong PrivateWorkingSetBytes; public ulong RssBytes; public ulong PrivateCommitBytes; public ulong CreationFileTime; }
  public sealed class HostRow { public double? HOST_CPU_UTILIZATION_PERCENT; public double HOST_AVAILABLE_MEMORY_MIB; public double HOST_COMMITTED_MEMORY_MIB; public string HOST_MEMORY_PRESSURE_STATE = "not_available"; }
  [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr OpenProcess(uint access, bool inherit, int id);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool TerminateProcess(IntPtr handle, uint exitCode);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool GetProcessTimes(IntPtr handle, out ulong creation, out ulong exit, out ulong kernel, out ulong user);
  [DllImport("psapi.dll", SetLastError = true)] static extern bool GetProcessMemoryInfo(IntPtr process, ref Counters counters, uint size);
  [DllImport("psapi.dll", SetLastError = true)] static extern bool GetPerformanceInfo(ref PerformanceInformation info, uint size);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool GetSystemTimes(out ulong idle, out ulong kernel, out ulong user);
  [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr CreateToolhelp32Snapshot(uint flags, uint processId);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool Process32FirstW(IntPtr snapshot, ref Entry entry);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool Process32NextW(IntPtr snapshot, ref Entry entry);
  static ulong priorIdle, priorKernel, priorUser;
  static bool hostStarted;
  public static HostRow ReadHost() {
    ulong idle, kernel, user;
    if (!GetSystemTimes(out idle, out kernel, out user)) throw new Win32Exception(Marshal.GetLastWin32Error());
    var info = new PerformanceInformation { cb = (uint)Marshal.SizeOf<PerformanceInformation>() };
    if (!GetPerformanceInfo(ref info, info.cb)) throw new Win32Exception(Marshal.GetLastWin32Error());
    double? cpu = null;
    if (hostStarted) {
      var total = (kernel - priorKernel) + (user - priorUser);
      if (total > 0) cpu = 100.0 * (1.0 - (double)(idle - priorIdle) / total);
    }
    priorIdle = idle; priorKernel = kernel; priorUser = user; hostStarted = true;
    return new HostRow { HOST_CPU_UTILIZATION_PERCENT = cpu,
      HOST_AVAILABLE_MEMORY_MIB = (double)info.physicalAvailable.ToUInt64() * info.pageSize.ToUInt64() / 1048576,
      HOST_COMMITTED_MEMORY_MIB = (double)info.commitTotal.ToUInt64() * info.pageSize.ToUInt64() / 1048576 };
  }
  static ulong Birth(int id) {
    var handle = OpenProcess(0x1000, false, id);
    if (handle == IntPtr.Zero) return 0;
    try {
      ulong creation, exit, kernel, user;
      return GetProcessTimes(handle, out creation, out exit, out kernel, out user) ? creation : 0;
    } finally { CloseHandle(handle); }
  }
  public static bool StopOwned(int id, ulong expectedBirth) {
    var handle = OpenProcess(0x1001, false, id); // Terminate + query-limited.
    if (handle == IntPtr.Zero) return false;
    try {
      ulong creation, exit, kernel, user;
      if (!GetProcessTimes(handle, out creation, out exit, out kernel, out user) || creation != expectedBirth) return false;
      // Identity check and termination use the same handle, avoiding PID reuse races.
      return TerminateProcess(handle, 0);
    } finally { CloseHandle(handle); }
  }
  public static ProcessRow[] OwnedSnapshot(int root, Dictionary<int, ulong> remembered) {
    var snapshot = CreateToolhelp32Snapshot(2, 0);
    if (snapshot == new IntPtr(-1)) throw new Win32Exception(Marshal.GetLastWin32Error());
    try {
      var entry = new Entry { size = (uint)Marshal.SizeOf<Entry>() };
      var edges = new List<ProcessRow>();
      if (!Process32FirstW(snapshot, ref entry)) throw new Win32Exception(Marshal.GetLastWin32Error());
      do { edges.Add(new ProcessRow { Id = (int)entry.id, Parent = (int)entry.parent }); } while (Process32NextW(snapshot, ref entry));
      var rootBirth = Birth(root);
      if (rootBirth == 0) throw new InvalidOperationException("Owned browser identity unavailable");
      var owned = new Dictionary<int, ulong>(); owned[root] = rootBirth;
      var births = new Dictionary<int, ulong>(); births[root] = rootBirth;
      foreach (var pair in remembered) {
        var birth = Birth(pair.Key); births[pair.Key] = birth;
        if (birth == pair.Value && birth >= rootBirth) owned[pair.Key] = birth;
      }
      bool added;
      do {
        added = false;
        foreach (var edge in edges) {
          if (owned.ContainsKey(edge.Id) || !owned.ContainsKey(edge.Parent)) continue;
          ulong birth;
          if (!births.TryGetValue(edge.Id, out birth)) { birth = Birth(edge.Id); births[edge.Id] = birth; }
          // A stale numeric parent PID cannot make an older process our child.
          // No name, command line or memory is read before this ownership check.
          if (birth == 0 || birth < owned[edge.Parent]) continue;
          owned[edge.Id] = birth; added = true;
        }
      } while (added);
      var result = edges.FindAll(edge => owned.ContainsKey(edge.Id));
      foreach (var edge in result) edge.CreationFileTime = owned[edge.Id];
      return result.ToArray();
    } finally { CloseHandle(snapshot); }
  }
  public static MemoryRow Read(int id) {
    var handle = OpenProcess(0x1000, false, id);
    if (handle == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error());
    try {
      var counters = new Counters { cb = (uint)Marshal.SizeOf<Counters>() };
      if (!GetProcessMemoryInfo(handle, ref counters, counters.cb)) throw new Win32Exception(Marshal.GetLastWin32Error());
      ulong creation, exit, kernel, user;
      if (!GetProcessTimes(handle, out creation, out exit, out kernel, out user)) throw new Win32Exception(Marshal.GetLastWin32Error());
      return new MemoryRow { PrivateWorkingSetBytes = counters.PrivateWorkingSetSize.ToUInt64(), RssBytes = counters.WorkingSetSize.ToUInt64(), PrivateCommitBytes = counters.PrivateUsage.ToUInt64(), CreationFileTime = creation };
    } finally { CloseHandle(handle); }
  }
}
