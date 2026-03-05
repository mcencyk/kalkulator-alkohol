import { useState } from 'react';
import './App.css';

const DRINKS = [
  { label: 'Piwo',       sub: '500ml · 5%',  ml: 500, perc: 5,  emoji: '🍺' },
  { label: 'Piwo',       sub: '330ml · 5%',  ml: 330, perc: 5,  emoji: '🫙' },
  { label: 'Piwo mocne', sub: '500ml · 8%',  ml: 500, perc: 8,  emoji: '🍻' },
  { label: 'Wino',       sub: '150ml · 12%', ml: 150, perc: 12, emoji: '🍷' },
  { label: 'Wino',       sub: '200ml · 13%', ml: 200, perc: 13, emoji: '🍾' },
  { label: 'Wódka',      sub: '50ml · 40%',  ml: 50,  perc: 40, emoji: '🥃' },
  { label: 'Whisky',     sub: '50ml · 40%',  ml: 50,  perc: 40, emoji: '🫗' },
  { label: 'Szampan',    sub: '150ml · 11%', ml: 150, perc: 11, emoji: '🥂' },
  { label: 'Nalewka',    sub: '50ml · 35%',  ml: 50,  perc: 35, emoji: '🍯' },
  { label: 'Własny',     sub: 'wpisz sam',   ml: 0,   perc: 0,  emoji: '✏️', custom: true },
];

const DRUGS = [
  { label: 'Marihuana',  sub: 'THC',      emoji: '🌿', impairH: 5,  detectH: 12 },
  { label: 'Kokaina',    sub: 'cocaine',  emoji: '❄️', impairH: 2,  detectH: 8  },
  { label: 'Amfetamina', sub: 'speed',    emoji: '💊', impairH: 10, detectH: 48 },
  { label: 'MDMA',       sub: 'ecstasy',  emoji: '🔵', impairH: 6,  detectH: 36 },
  { label: 'Heroina',    sub: 'opioid',   emoji: '💉', impairH: 5,  detectH: 24 },
  { label: 'Benzo',      sub: 'diazepam', emoji: '🟡', impairH: 8,  detectH: 72 },
  { label: 'LSD',        sub: 'kwas',     emoji: '🎨', impairH: 10, detectH: 12 },
  { label: 'Ketamina',   sub: 'ket',      emoji: '🧪', impairH: 3,  detectH: 6  },
];

const ELIMINATION = 0.15;
const LEGAL_LIMIT = 0.2;
const DUI_LIMIT   = 0.5;

function calcAlcoholGrams(ml, perc) { return ml * (perc / 100) * 0.789; }
function calcBAC(grams, weightKg, gender) { return grams / (weightKg * (gender === 'male' ? 0.7 : 0.6)); }
function fmt(bac) { return bac.toFixed(2) + ' ‰'; }
function formatHours(h) {
  if (h <= 0) return 'Teraz';
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  if (hh === 0) return `${mm} min`;
  if (mm === 0) return `${hh} godz.`;
  return `${hh} godz. ${mm} min`;
}
function barColor(bac) {
  if (bac <= LEGAL_LIMIT) return '#4ade80';
  if (bac <= DUI_LIMIT) return '#fbbf24';
  return '#f87171';
}

export default function App() {
  const [weight, setWeight] = useState(75);
  const [gender, setGender] = useState('male');
  const [drinkingHoursAgo, setDrinkingHoursAgo] = useState(0);
  const [food, setFood] = useState('none');
  const [drinkCounts, setDrinkCounts] = useState({});
  const [customMl, setCustomMl] = useState(500);
  const [customPerc, setCustomPerc] = useState(5);
  const [selectedDrugs, setSelectedDrugs] = useState(new Set());
  const [drugHoursAgo, setDrugHoursAgo] = useState(0);

  const customIdx = DRINKS.length - 1;
  function addDrink(i) { setDrinkCounts(c => ({ ...c, [i]: (c[i] || 0) + 1 })); }
  function removeDrink(i) {
    setDrinkCounts(c => { const n = { ...c, [i]: (c[i] || 0) - 1 }; if (n[i] <= 0) delete n[i]; return n; });
  }

  const totalGrams = DRINKS.reduce((sum, drink, i) => {
    const count = drinkCounts[i] || 0;
    if (!count) return sum;
    return sum + calcAlcoholGrams(drink.custom ? customMl : drink.ml, drink.custom ? customPerc : drink.perc) * count;
  }, 0);

  const foodFactor = { none: 1.0, snack: 0.85, meal: 0.70, heavy: 0.60 }[food];
  const bac0 = weight > 0 ? calcBAC(totalGrams, weight, gender) * foodFactor : 0;
  const currentBAC = Math.max(0, bac0 - ELIMINATION * drinkingHoursAgo);
  const hoursToLegal = currentBAC > LEGAL_LIMIT ? (currentBAC - LEGAL_LIMIT) / ELIMINATION : 0;
  const driveTime = new Date();
  driveTime.setMinutes(driveTime.getMinutes() + Math.round(hoursToLegal * 60));

  const drugsActive = selectedDrugs.size > 0;
  const drugImpairRemaining = drugsActive ? Math.max(...[...selectedDrugs].map(i => Math.max(0, DRUGS[i].impairH - drugHoursAgo))) : 0;
  const drugDetectRemaining = drugsActive ? Math.max(...[...selectedDrugs].map(i => Math.max(0, DRUGS[i].detectH - drugHoursAgo))) : 0;

  let panelClass = 'safe', statusText = 'Możesz prowadzić';
  if (currentBAC > DUI_LIMIT) { panelClass = 'danger'; statusText = 'Stan nietrzeźwości!'; }
  else if (currentBAC > LEGAL_LIMIT) { panelClass = 'warn'; statusText = 'Nie można prowadzić'; }
  if (drugsActive) { panelClass = 'danger'; statusText = 'Narkotyki — ZAKAZ!'; }

  const maxBAC = Math.max(bac0, 0.5);
  const timelineHours = Math.ceil(bac0 / ELIMINATION) + 1;
  const timelinePoints = Array.from({ length: Math.min(timelineHours, 24) + 1 }, (_, i) => ({
    h: i, bac: Math.max(0, bac0 - ELIMINATION * (drinkingHoursAgo + i)),
  }));

  return (
    <div className="container">
      <div className="logo-wrap">
        <svg width="68" height="64" viewBox="0 0 34 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.36761 21.3333H3.91174C2.31028 21.3333 1 19.9619 1 18.2857V15.3447C1 14.3238 1.48044 13.379 2.29572 12.8152L5.36761 10.6666L7.42039 8.51807C7.97362 7.93902 8.70156 7.61902 9.47317 7.61902H20.1592C20.9309 7.61902 21.6734 7.93902 22.212 8.51807L27.1765 13.7143L30.8016 14.659C32.0974 14.9943 33 16.2133 33 17.6152V19.8095C33 20.6476 32.3449 21.3333 31.5441 21.3333H30.0883" stroke="#CCDFE9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20.1867 22C20.1867 23.4912 18.9779 24.7 17.4867 24.7C15.9955 24.7 14.7867 23.4912 14.7867 22C14.7867 20.5088 15.9955 19.3 17.4867 19.3C18.9779 19.3 20.1867 20.5088 20.1867 22Z" stroke="#CCDFE9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path id="logo-gear" d="M19.697 14.2308C19.452 13.4958 18.7641 13 17.9893 13H16.9841C16.2093 13 15.5214 13.4958 15.2764 14.2308L14.9311 15.2667C14.2018 15.5437 13.5292 15.9357 12.9354 16.4207L11.8635 16.2013C11.1044 16.046 10.3311 16.3938 9.94376 17.0648L9.44113 17.9354C9.05374 18.6063 9.13917 19.4499 9.65321 20.0296L10.3784 20.8475C10.3181 21.2227 10.2867 21.6077 10.2867 22C10.2867 22.3923 10.3181 22.7773 10.3784 23.1525L9.65321 23.9704C9.13917 24.5501 9.05374 25.3937 9.44113 26.0646L9.94376 26.9352C10.3311 27.6062 11.1044 27.954 11.8635 27.7987L12.9354 27.5793C13.5292 28.0643 14.2018 28.4563 14.9311 28.7333L15.2764 29.7692C15.5214 30.5042 16.2093 31 16.9841 31H17.9893C18.7641 31 19.452 30.5042 19.697 29.7692L20.0423 28.7333C20.7715 28.4563 21.4441 28.0643 22.0379 27.5794L23.1099 27.7988C23.869 27.9541 24.6422 27.6063 25.0296 26.9354L25.5323 26.0648C25.9196 25.3938 25.8342 24.5502 25.3202 23.9705L24.5949 23.1526C24.6553 22.7773 24.6867 22.3923 24.6867 22C24.6867 21.6077 24.6553 21.2227 24.5949 20.8475L25.3202 20.0296C25.8342 19.4499 25.9196 18.6063 25.5323 17.9354L25.0296 17.0648C24.6422 16.3938 23.869 16.046 23.1099 16.2013L22.038 16.4207C21.4442 15.9357 20.7716 15.5437 20.0423 15.2667L19.697 14.2308Z" stroke="#CCDFE9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div>
          <h1>Kalkulator spożycia</h1>
          <p className="subtitle">Kiedy mogę prowadzić samochód? (prawo polskie)</p>
        </div>
      </div>

      <div className="app-layout">
      <div className="app-inputs">

      <div className="card">
        <h2>Dane osoby</h2>
        <div className="row">
          <div className="field">
            <label>Płeć</label>
            <div className="gender-btns">
              {[{ val: 'male', label: 'Mężczyzna' }, { val: 'female', label: 'Kobieta' }].map(g => (
                <button key={g.val} className={`gender-btn ${gender === g.val ? 'active' : ''}`} onClick={() => setGender(g.val)}>{g.label}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Waga (kg)</label>
            <input type="number" min="30" max="250" value={weight} onChange={e => setWeight(Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Wypite napoje</h2>
        <div className="drink-grid">
          {DRINKS.map((drink, i) => {
            const count = drinkCounts[i] || 0;
            return (
              <div key={i} className={`drink-card ${count > 0 ? 'active' : ''}`} onClick={() => addDrink(i)}>
                {count > 0 && <span className="drink-badge">{count}</span>}
                <span className="drink-emoji">{drink.emoji}</span>
                <span className="drink-name">{drink.label}</span>
                <span className="drink-sub">{drink.sub}</span>
                {count > 0 && <button className="drink-minus" onClick={e => { e.stopPropagation(); removeDrink(i); }}>−</button>}
              </div>
            );
          })}
        </div>
        {(drinkCounts[customIdx] || 0) > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', flexShrink: 0 }}>Własny napój:</span>
            <input type="number" placeholder="ml" min="0" value={customMl} onChange={e => setCustomMl(Number(e.target.value))} style={{ maxWidth: 80 }} />
            <input type="number" placeholder="%" min="0" max="100" value={customPerc} onChange={e => setCustomPerc(Number(e.target.value))} style={{ maxWidth: 70 }} />
          </div>
        )}
        <div style={{ marginTop: 16, borderTop: '1px solid #334155', paddingTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Ile godzin temu skończyłem pić?</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>{drinkingHoursAgo === 0 ? 'Teraz' : formatHours(drinkingHoursAgo)}</span>
          </div>
          <input type="range" min="0" max="24" step="0.5" value={drinkingHoursAgo} onChange={e => setDrinkingHoursAgo(Number(e.target.value))} className="time-slider" style={{ '--val': `${(drinkingHoursAgo / 24) * 100}%` }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: '0.65rem', color: '#475569' }}>0h</span>
            <span style={{ fontSize: '0.65rem', color: '#475569' }}>24h</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Zażyte substancje</h2>
        <div style={{ background: '#7f1d1d33', border: '1px solid #dc262655', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: '0.78rem', color: '#fca5a5', lineHeight: 1.5 }}>
          ⚠️ W Polsce jazda pod wpływem jakichkolwiek narkotyków jest zawsze przestępstwem (art. 178a KK), niezależnie od ilości.
        </div>
        <div className="drink-grid">
          {DRUGS.map((drug, i) => (
            <div key={i} className={`drink-card ${selectedDrugs.has(i) ? 'active' : ''}`}
              onClick={() => setSelectedDrugs(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })}>
              <span className="drink-emoji">{drug.emoji}</span>
              <span className="drink-name">{drug.label}</span>
              <span className="drink-sub">{drug.sub}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, borderTop: '1px solid #334155', paddingTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Ile godzin temu zażyłeś?</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>{drugHoursAgo === 0 ? 'Teraz' : formatHours(drugHoursAgo)}</span>
          </div>
          <input type="range" min="0" max="96" step="0.5" value={drugHoursAgo} onChange={e => setDrugHoursAgo(Number(e.target.value))} className="time-slider" style={{ '--val': `${(drugHoursAgo / 96) * 100}%` }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: '0.65rem', color: '#475569' }}>0h</span>
            <span style={{ fontSize: '0.65rem', color: '#475569' }}>96h</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Jedzenie</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { val: 'none', emoji: '🫙', label: 'Pusty żołądek', desc: '100%' },
            { val: 'snack', emoji: '🥨', label: 'Przekąska', desc: '-15%' },
            { val: 'meal', emoji: '🍱', label: 'Posiłek', desc: '-30%' },
            { val: 'heavy', emoji: '🥩', label: 'Obfity', desc: '-40%' },
          ].map(f => (
            <div key={f.val} className={`drink-card ${food === f.val ? 'active' : ''}`} onClick={() => setFood(f.val)}>
              <span className="drink-emoji">{f.emoji}</span>
              <span className="drink-name">{f.label}</span>
              <span className="drink-sub">{f.desc}</span>
            </div>
          ))}
        </div>
      </div>

      </div>

      <div className="app-result">
      <div className={`result-panel ${panelClass}`}>
        <div className="bac-value">{fmt(currentBAC)}</div>
        <div className="bac-label">Szacowane stężenie alkoholu we krwi</div>
        <div className="status-badge">{statusText}</div>
        {currentBAC > LEGAL_LIMIT ? (
          <div>
            <div className="drive-info">Możesz prowadzić za:</div>
            <div className="drive-time">{formatHours(hoursToLegal)}</div>
            <div className="drive-info" style={{ fontSize: '0.8rem', marginTop: 6, color: '#94a3b8' }}>
              ok. {driveTime.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ) : (
          <div className="drive-info" style={{ color: '#4ade80' }}>Stężenie poniżej limitu 0,2 ‰</div>
        )}

        {drugsActive && (
          <div style={{ marginTop: 12, padding: 12, background: '#7f1d1d33', borderRadius: 8, textAlign: 'left', fontSize: '0.82rem' }}>
            <div style={{ fontWeight: 700, color: '#f87171', marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {[...selectedDrugs].map(i => <span key={i} style={{ background: '#7f1d1d55', borderRadius: 6, padding: '2px 7px' }}>{DRUGS[i].emoji} {DRUGS[i].label}</span>)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#94a3b8' }}>Szacowane upośledzenie:</span>
              <span style={{ color: drugImpairRemaining > 0 ? '#f87171' : '#4ade80', fontWeight: 600 }}>
                {drugImpairRemaining > 0 ? `jeszcze ${formatHours(drugImpairRemaining)}` : 'minęło'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Wykrywalność we krwi:</span>
              <span style={{ color: drugDetectRemaining > 0 ? '#fbbf24' : '#4ade80', fontWeight: 600 }}>
                {drugDetectRemaining > 0 ? `jeszcze ${formatHours(drugDetectRemaining)}` : 'poniżej progu'}
              </span>
            </div>
            <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4 }}>Czasy szacunkowe. W Polsce jazda po narkotykach jest zawsze nielegalna.</div>
          </div>
        )}

        {bac0 > 0 && (
          <div className="timeline">
            <h3>Spadek stężenia od teraz</h3>
            {timelinePoints.map(({ h, bac }) => (
              <div className="tl-row" key={h}>
                <span className="tl-hour">+{h}h</span>
                <div className="tl-bar-wrap">
                  <div className="tl-bar" style={{ width: `${Math.min(100, (bac / Math.max(maxBAC, 0.01)) * 100)}%`, background: barColor(bac) }} />
                </div>
                <span className="tl-val">{bac > 0 ? bac.toFixed(2) : '0.00'} ‰</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="disclaimer" style={{ marginTop: 12 }}>
        Obliczenia oparte na wzorze Widmarka (współczynnik eliminacji 0,15 ‰/h).<br/>
        Wynik jest szacunkowy i może się różnić w zależności od wielu czynników.<br/>
        <strong>Limit w Polsce: 0,2 ‰ (prawo jazdy), 0,5 ‰ (przestępstwo).</strong><br/>
        Nie polegaj na tym kalkulatorze przy decyzji o prowadzeniu pojazdu.
      </p>
      </div>
      </div>
    </div>
  );
}
