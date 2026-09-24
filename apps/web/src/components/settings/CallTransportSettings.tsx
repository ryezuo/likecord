'use client';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import {
  DEFAULT_CALL_TRANSPORT,
  TRANSPORT_PRIORITIES,
  type TransportField,
  type TransportFieldState,
} from '../../lib/callTransport';

const labels = {
  idle: 'Aguardando CALL',
  pending: 'Aguardando aplicação ou negociação',
  applied: 'Pedido confirmado pela API',
  partial: 'Parcial entre peers',
  unavailable: 'Indisponível ou não confirmado',
  failed: 'Falhou — chamada preservada',
  inactive: 'Inativo com intervalo adaptativo ligado',
};
function Evidence({ value }: { value?: TransportFieldState }) {
  if (!value)
    return (
      <p className="user-settings-field-help">Disponibilidade após entrada autorizada em Voice.</p>
    );
  const display = (v: unknown) =>
    v === null ? 'Auto / não informado' : v === true ? 'On' : v === false ? 'Off' : String(v);
  return (
    <p className="user-settings-field-help">
      Solicitado: {display(value.requested)}. {labels[value.status]}.
      {value.total > 0 &&
        ` ${value.applied}/${value.total} confirmado(s). Retorno observado: ${value.effective.map(display).join(', ')}.`}
    </p>
  );
}
export default function CallTransportSettings() {
  const { capture, updateCallTransport, retryCallTransport } = useUserPreferences();
  const state = capture.state?.transport,
    profile = state?.profile ?? DEFAULT_CALL_TRANSPORT;
  const disabled = !capture.ready;
  const unavailable = (field: TransportField) =>
    disabled ||
    state?.fields[field].status === 'unavailable' ||
    state?.fields[field].status === 'idle';
  return (
    <section className="voice-audio-section" aria-labelledby="call-transport-title">
      <details className="audio-output-advanced">
        <summary id="call-transport-title">Avançado — transporte da chamada</summary>
        <p className="user-settings-field-help">
          Preferências desta conta neste navegador. Cada peer pode aceitar valores diferentes; não
          alteram Screen Share. Retorno da API não garante o efeito na rede.
        </p>
        <div className="user-settings-field">
          <label htmlFor="call-bitrate">Limite de envio (kbit/s)</label>
          <input
            id="call-bitrate"
            type="number"
            min={6}
            max={510}
            step={1}
            placeholder="Auto"
            value={profile.maxBitrateKbps ?? ''}
            disabled={disabled}
            onChange={(e) => {
              if (e.target.validity.valid)
                updateCallTransport({
                  maxBitrateKbps: e.target.value === '' ? null : Number(e.target.value),
                });
            }}
          />
          <Evidence value={state?.fields.maxBitrateKbps} />
        </div>
        <div className="user-settings-field">
          <label htmlFor="call-codec">Codec preferido</label>
          <select
            id="call-codec"
            value={profile.preferredCodec ?? ''}
            disabled={disabled}
            onChange={(e) => updateCallTransport({ preferredCodec: e.target.value || null })}
          >
            <option value="">Auto</option>
            {profile.preferredCodec &&
              !state?.codecs.some((c) => c.value === profile.preferredCodec) && (
                <option value={profile.preferredCodec} disabled>
                  Intenção salva — indisponível
                </option>
              )}
            {state?.codecs.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <Evidence value={state?.fields.preferredCodec} />
          <p className="user-settings-field-help">
            A preferência pode exigir negociação com cada peer. O codec observado vem do sender da
            chamada.
          </p>
        </div>
        <div className="user-settings-field">
          <label htmlFor="call-content-hint">Tipo de conteúdo</label>
          <select
            id="call-content-hint"
            value={profile.contentHint ?? ''}
            disabled={disabled}
            onChange={(e) =>
              updateCallTransport({
                contentHint: (e.target.value || null) as typeof profile.contentHint,
              })
            }
          >
            <option value="">Auto</option>
            <option value="speech">Fala</option>
            <option value="speech-recognition">Fala para reconhecimento</option>
            <option value="music">Música</option>
          </select>
          <Evidence value={state?.fields.contentHint} />
          <p className="user-settings-field-help">
            Sugestão ao navegador; não inicia transcrição e não altera AEC, AGC ou supressão.
          </p>
        </div>
        <div className="user-settings-field">
          <label htmlFor="call-jitter">Alvo do buffer de recepção (ms)</label>
          <input
            id="call-jitter"
            type="number"
            min={0}
            max={4000}
            step="any"
            placeholder="Auto"
            value={profile.jitterBufferTargetMs ?? ''}
            disabled={disabled}
            onChange={(e) => {
              if (e.target.validity.valid)
                updateCallTransport({
                  jitterBufferTargetMs: e.target.value === '' ? null : Number(e.target.value),
                });
            }}
          />
          <Evidence value={state?.fields.jitterBufferTargetMs} />
          <p className="user-settings-field-help">
            Alvo de buffering dos receivers CALL identificados; não representa ping ou latência
            total.
          </p>
        </div>
        {(['priority', 'networkPriority'] as const).map((field) => (
          <div className="user-settings-field" key={field}>
            <label htmlFor={`call-${field}`}>
              {field === 'priority' ? 'Prioridade de mídia' : 'Prioridade de rede'}
            </label>
            <select
              id={`call-${field}`}
              value={profile[field] ?? ''}
              disabled={unavailable(field)}
              onChange={(e) => updateCallTransport({ [field]: e.target.value || null })}
            >
              <option value="">Auto</option>
              {TRANSPORT_PRIORITIES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <Evidence value={state?.fields[field]} />
          </div>
        ))}
        <p className="user-settings-field-help">
          Prioridade é uma preferência; não comprova QoS ou marcação DSCP na rede.
        </p>
        <div className="user-settings-field">
          <label htmlFor="call-ptime">Intervalo de pacotes (ms)</label>
          <select
            id="call-ptime"
            value={profile.ptimeMs ?? ''}
            disabled={disabled || profile.adaptivePtime === true || !state?.ptimeValues.length}
            onChange={(e) =>
              updateCallTransport({
                ptimeMs: e.target.value === '' ? null : Number(e.target.value),
              })
            }
          >
            <option value="">Auto</option>
            {profile.ptimeMs !== null && !state?.ptimeValues.includes(profile.ptimeMs) && (
              <option value={profile.ptimeMs} disabled>
                {profile.ptimeMs} — intenção salva
              </option>
            )}
            {state?.ptimeValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <Evidence value={state?.fields.ptimeMs} />
          <p className="user-settings-field-help">
            Somente valores efetivamente reportados e aceitos pelo navegador. Sem propriedade
            configurável: indisponível.
          </p>
        </div>
        <div className="user-settings-field">
          <label htmlFor="call-adaptive-ptime">Intervalo adaptativo de pacotes</label>
          <select
            id="call-adaptive-ptime"
            value={profile.adaptivePtime === null ? '' : String(profile.adaptivePtime)}
            disabled={unavailable('adaptivePtime')}
            onChange={(e) =>
              updateCallTransport({
                adaptivePtime: e.target.value === '' ? null : e.target.value === 'true',
              })
            }
          >
            <option value="">Auto</option>
            <option value="false">Off</option>
            <option value="true">On</option>
          </select>
          <Evidence value={state?.fields.adaptivePtime} />
          <p className="user-settings-field-help">
            On suspende o intervalo fixo e preserva sua intenção salva.
          </p>
        </div>
        {state?.unsaved && (
          <p role="alert" className="user-settings-sync-error">
            Unsaved — armazenamento local indisponível. Sua intenção foi mantida nesta sessão.
          </p>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          disabled={disabled}
          onClick={retryCallTransport}
        >
          Retry — transporte CALL
        </button>
      </details>
    </section>
  );
}
