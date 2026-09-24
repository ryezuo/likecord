"use client";

import { useEffect, useState } from "react";
import type { EchoCancellationIntent, CapturePreferences } from "@likecord/shared/capture-preferences";
import { useUserPreferences } from "../../hooks/useUserPreferences";
import { FORMAT_FIELDS, NATIVE_FIELDS, SYSTEM_DEFAULT_INPUT, nativeValue, type NativeValue, type CaptureEvidence } from "../../lib/nativeCapture";
import CallTransportSettings from "./CallTransportSettings";

const NATIVE_LABELS = { echoCancellation: "Echo Cancellation", noiseSuppression: "Browser Noise Suppression", autoGainControl: "Automatic Gain Control", voiceIsolation: "Voice Isolation" };
const FORMAT_LABELS = { channelCount: "Capture channels", sampleRate: "Capture sample rate (Hz)", sampleSize: "Capture sample size (bits)", latency: "Requested capture latency (s)" };
const LABELS = { AUTO: "Auto", OFF: "Off", ON: "On", ALL: "All", REMOTE_ONLY: "Remote only" };
function intent(value: NativeValue): EchoCancellationIntent { return value === false ? "OFF" : value === true ? "ON" : value === "all" ? "ALL" : "REMOTE_ONLY"; }
function display(value: NativeValue | number | null | undefined) { return value === null || value === undefined ? "não informado" : value === true ? "On" : value === false ? "Off" : String(value); }
function Evidence({ value, desired }: { value?: CaptureEvidence; desired: NativeValue | number | null }) {
  return <p className="user-settings-field-help">
    Solicitado: {desired === null ? "Auto (sem constraint)" : display(desired)}.
    {value ? <> Pedido registrado pelo navegador: {display(value.requested)}. Reportado: {display(value.reported)}.
      {desired !== null && value.reported !== null && desired !== value.reported && " O valor reportado é diferente do solicitado."}
      {value.state === "fixed" && " Valor fixo nesta fonte."}
      {value.state === "unavailable" && " Indisponível neste navegador."}
      {value.state === "unknown" && " O navegador não informou um domínio configurável."}
    </> : " Disponibilidade após teste autorizado ou entrada em Voice."}
  </p>;
}

export default function CaptureSettings() {
  const { preferences, capture, updateCapture, commitCapture, startMicTest, stopMicTest, chooseInput, updateCaptureFormat, retryCapture, useBrowserCaptureForSession } = useUserPreferences();
  const state = capture.state;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => () => { stopMicTest(); commitCapture(); }, [stopMicTest, commitCapture]);
  useEffect(() => {
    if (!state?.mode || state.mode === "idle") return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [state?.mode]);
  const applying = state?.status === "applying";
  const meter = state?.meter;
  const fresh = meter && now - meter.at < 1500 && state?.status !== "failed";
  const inputId = state?.deviceId ?? SYSTEM_DEFAULT_INPUT;
  const canEdit = capture.ready && !applying;
  return <>
    <section className="voice-audio-section" aria-labelledby="capture-title">
      <h4 id="capture-title">Entrada</h4>
      <div className="user-settings-field">
        <label htmlFor="capture-suppression-mode">Supressão de ruído</label>
        <select id="capture-suppression-mode" value={preferences.noiseSuppressionMode} disabled={!canEdit}
          onChange={e=>updateCapture({noiseSuppressionMode:e.target.value as CapturePreferences["noiseSuppressionMode"]})}>
          <option value="BROWSER">Navegador</option><option value="OFF">Off</option><option value="RNNOISE">RNNoise</option>
        </select>
        <p className="user-settings-field-help">RNNoise processa a entrada em mono a 48 kHz, com pre-roll fixo de 10 ms quando Voice Activation está ligado. O processamento inicia apenas no teste ou na chamada autorizada.</p>
        {state?.suppression?.effective==="RNNOISE"&&state.evidence?.channelCount.reported===2&&<p className="user-settings-field-help">A entrada estéreo é combinada em mono antes do RNNoise.</p>}
        <p className="user-settings-field-help">Solicitado: {preferences.noiseSuppressionMode}. Em uso: {state?.suppression?.effective??"nenhuma captura ativa"}.
          {preferences.noiseSuppressionMode!=="BROWSER"&&` Supressão/isolamento nativos: ${state?.suppression?.nativeDisabled==="confirmed"?"Off reportado":state?.suppression?.nativeDisabled==="limited"?"limitação reportada pelo navegador":"estado não confirmado pelo navegador"}.`}</p>
        {state?.suppression?.sessionBrowser && <p className="user-settings-field-help">Navegador somente nesta sessão. Sua preferência RNNoise foi mantida. <button type="button" className="btn btn-secondary" disabled={applying} onClick={retryCapture}>Tentar RNNoise novamente</button></p>}
      </div>
      <div className="user-settings-field">
        <label htmlFor="capture-device">Microfone</label>
        <select id="capture-device" value={inputId} disabled={!canEdit} onChange={(event) => chooseInput(event.target.value)}>
          <option value={SYSTEM_DEFAULT_INPUT}>Auto — padrão do sistema</option>
          {inputId !== SYSTEM_DEFAULT_INPUT && !state?.devices.some((device) => device.deviceId === inputId)
            && <option value={inputId}>Microfone salvo — disponibilidade não confirmada</option>}
          {state?.devices.map((device, index) => <option value={device.deviceId} key={device.deviceId}>{device.label || `Microfone ${index + 1}`}</option>)}
        </select>
        <p className="user-settings-field-help">A lista é revelada apenas durante captura autorizada. A escolha fica neste navegador e nesta conta.</p>
        {state?.mode !== "idle" && <p className="user-settings-field-help">Microfone reportado: {state?.devices.find((device) => device.deviceId === state.effectiveDeviceId)?.label || "não identificado pelo navegador"}.</p>}
        {state?.storage === "memory" && <p className="user-settings-field-help">Armazenamento local indisponível. A escolha vale apenas nesta sessão.</p>}
      </div>
      <div className="user-settings-field">
        <label htmlFor="capture-gain">Input Volume <output htmlFor="capture-gain">{preferences.inputGainPercent}%</output></label>
        <input id="capture-gain" type="range" min={0} max={200} step={1} value={preferences.inputGainPercent} disabled={!capture.ready}
          aria-valuetext={`${preferences.inputGainPercent}%`} onChange={(event) => updateCapture({ inputGainPercent: Number(event.target.value) })}
          onPointerUp={commitCapture} onKeyUp={commitCapture} onBlur={commitCapture} />
        <p className="user-settings-field-help">Ganho manual de entrada, independente de AGC. Zero silencia o sinal sem mudar seu estado de mute. A proteção de picos evita sobrecarga.</p>
      </div>
      <div className="user-settings-actions">
        {state?.mode === "test" ? <button type="button" className="btn btn-secondary" onClick={stopMicTest}>Parar teste</button>
          : state?.mode === "call" ? <span className="user-settings-field-help">Usando o microfone e o medidor da chamada atual.</span>
            : <button type="button" className="btn btn-secondary" disabled={!capture.ready} onClick={startMicTest}>Testar microfone</button>}
      </div>
      <p className="user-settings-field-help">O teste dura até 30 segundos. Sem reprodução local, gravação, envio de áudio ou entrada em Voice.</p>
      <div className="capture-meter">
        <label htmlFor="capture-level">Nível de entrada {fresh ? `${Math.round(meter.dbfs)} dBFS` : "— indisponível ou desatualizado"}</label>
        <meter id="capture-level" min={-120} max={0} value={fresh ? meter.dbfs : -120}
          aria-valuetext={fresh ? `${Math.round(meter.dbfs)} dBFS, antes do gate` : "Medidor indisponível ou desatualizado"} />
        <span className="user-settings-field-help">Após ganho e proteção de picos, antes do gate.
          {fresh && ` Gate ${meter.gateOpen ? "aberto" : "fechado"}.`}
          {state?.mode === "call" && ` Transmissão ${state.transmitting ? "permitida" : "silenciada"}.`}</span>
      </div>
      <label className="user-settings-preference">
        <span className="user-settings-preference-copy"><strong>Voice Activation</strong><span>Transmitir voz quando o nível ultrapassar o limiar. Mute e permissões sempre prevalecem.</span></span>
        <input type="checkbox" checked={preferences.voiceActivationEnabled} disabled={!capture.ready}
          onChange={(event) => updateCapture({ voiceActivationEnabled: event.target.checked })} />
      </label>
      <div className="user-settings-field">
        <label htmlFor="capture-threshold">Limiar de ativação de voz <output htmlFor="capture-threshold">{preferences.voiceActivationThresholdDbfs} dBFS</output></label>
        <input id="capture-threshold" type="range" min={-80} max={-10} step={1} disabled={!capture.ready}
          value={preferences.voiceActivationThresholdDbfs} aria-valuetext={`${preferences.voiceActivationThresholdDbfs} dBFS`}
          onChange={(event) => updateCapture({ voiceActivationThresholdDbfs: Number(event.target.value) })}
          onPointerUp={commitCapture} onKeyUp={commitCapture} onBlur={commitCapture} />
        <p className="user-settings-field-help">Um valor mais negativo permite voz mais baixa. O limiar é preservado quando Voice Activation está desligado.</p>
      </div>
      {applying && <p role="status" className="user-settings-sync-status">Aplicando configuração de captura…</p>}
      {state?.error && <div className="error-banner user-settings-sync-error" role="alert"><span>{state.error}</span>
        {state.mode !== "idle" && <button type="button" className="btn btn-secondary" onClick={retryCapture}>Tentar novamente</button>}
        {preferences.noiseSuppressionMode === "RNNOISE" && <button type="button" className="btn btn-secondary" onClick={useBrowserCaptureForSession}>Usar Navegador nesta sessão</button>}</div>}
      {capture.mutationStatus === "error" && <div className="error-banner user-settings-sync-error" role="alert">
        <span>Unsaved — {capture.error} Sua intenção local foi mantida.</span><button type="button" className="btn btn-secondary" onClick={commitCapture}>Retry</button>
      </div>}
      {capture.mutationStatus === "saving" && <p role="status" className="user-settings-sync-status">Salvando preferências de entrada…</p>}
    </section>
    <section className="voice-audio-section" aria-labelledby="native-capture-title">
      <h4 id="native-capture-title">Processamento nativo</h4>
      <p className="user-settings-field-help">Auto deixa o navegador escolher. Os valores reportados não comprovam o efeito acústico; cada controle é independente.</p>
      {NATIVE_FIELDS.map((field) => {
        const key = `${field}Intent` as keyof Pick<CapturePreferences, "echoCancellationIntent" | "noiseSuppressionIntent" | "autoGainControlIntent" | "voiceIsolationIntent">;
        const desired = preferences[key];
        const suspended = preferences.noiseSuppressionMode !== "BROWSER" && !state?.suppression?.sessionBrowser && (field === "noiseSuppression" || field === "voiceIsolation");
        const evidence = state?.evidence?.[field];
        const values = evidence?.state === "configurable" && Array.isArray(evidence.domain) ? evidence.domain.map(intent) : [];
        return <div className="user-settings-field" key={field}>
          <label htmlFor={`capture-${field}`}>{NATIVE_LABELS[field]}</label>
          <select id={`capture-${field}`} disabled={!canEdit || suspended || (values.length === 0 && desired === "AUTO")} value={desired}
            onChange={(event) => updateCapture({ [key]: event.target.value })}>
            <option value="AUTO">Auto</option>
            {desired !== "AUTO" && !values.includes(desired) && <option value={desired} disabled>{LABELS[desired]} — intenção salva, indisponível</option>}
            {values.map((value) => <option key={value} value={value}>{LABELS[value]}</option>)}
          </select>
          <Evidence value={evidence} desired={nativeValue(desired)} />
          {suspended&&<p className="user-settings-field-help">Intenção salva suspensa neste modo. Off é solicitado quando a captura oferece esse controle; voltar a Navegador restaura a intenção.</p>}
        </div>;
      })}
      <details className="audio-output-advanced">
        <summary>Avançado — captura</summary>
        <p className="user-settings-field-help">Formato local deste microfone. O navegador valida as combinações; um intervalo reportado não garante que toda combinação funcione.</p>
        {state?.processedFormat && <p className="user-settings-field-help">Sinal processado: {state.processedFormat.sampleRate} Hz, {state.processedFormat.channels} canais. O navegador pode converter a taxa nativa antes do processamento.</p>}
        {FORMAT_FIELDS.map((field) => {
          const evidence = state?.evidence?.[field];
          const domain = evidence?.domain && !Array.isArray(evidence.domain) ? evidence.domain : null;
          const value = state?.format[field] ?? null;
          return <div key={field} className="user-settings-field">
            <label htmlFor={`capture-${field}`}>{FORMAT_LABELS[field]}</label>
            {domain && evidence?.state === "configurable" ? <input id={`capture-${field}`} type="number" min={domain.min} max={domain.max}
              step={field === "latency" ? "any" : 1} value={value ?? ""} placeholder="Auto" disabled={!canEdit}
              onChange={(event) => {
                if (!state || !event.target.validity.valid) return;
                updateCaptureFormat({ ...state.format, [field]: event.target.value === "" ? null : Number(event.target.value) });
              }} /> : <span id={`capture-${field}`}>{value ?? "Auto"}</span>}
            <Evidence value={evidence} desired={value} />
            {value !== null && state && <button type="button" className="btn btn-secondary" disabled={!canEdit}
              onClick={() => updateCaptureFormat({ ...state.format, [field]: null })}>Usar Auto</button>}
          </div>;
        })}
      </details>
    </section>
    <CallTransportSettings />
  </>;
}
