import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Camera, Download, DoorOpen, Eraser, Home, Image as ImageIcon, Mic, Plus, Save, Square, StickyNote, Trash2, Upload, Wand2, X } from 'lucide-react';
import './styles.css';

const ROOM_TYPES = ['浴室', '洗面所', 'トイレ', 'キッチン', 'LDK', '洋室', '和室', '廊下', '収納', 'その他'];
const PART_TYPES = ['ドア', '窓', 'クローゼット', '開口', '収納', '点検口'];
const STORAGE_KEY = 'gencho-note-drawing-v01';

const uid = () => Math.random().toString(36).slice(2, 10);

const defaultRoom = (type = '洗面所') => ({
  id: uid(),
  name: type,
  type,
  width: 2500,
  depth: 1800,
  height: 2400,
  parts: [],
  notes: '',
  photos: [],
  freehand: null,
  createdAt: new Date().toISOString(),
});

function App() {
  const [siteName, setSiteName] = useState('明日現調テスト');
  const [rooms, setRooms] = useState([defaultRoom('浴室'), defaultRoom('洗面所')]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [tab, setTab] = useState('plan');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setSiteName(data.siteName || '明日現調テスト');
        setRooms(data.rooms?.length ? data.rooms : [defaultRoom('浴室')]);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ siteName, rooms }));
  }, [siteName, rooms]);

  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0];

  const updateRoom = (patch) => {
    setRooms(prev => prev.map(r => r.id === activeRoom.id ? { ...r, ...patch } : r));
  };

  const addRoom = (type) => {
    const room = defaultRoom(type);
    setRooms(prev => [...prev, room]);
    setActiveRoomId(room.id);
    setShowAdd(false);
  };

  const deleteRoom = (id) => {
    if (rooms.length <= 1) return;
    setRooms(prev => prev.filter(r => r.id !== id));
    if (activeRoomId === id) setActiveRoomId(rooms[0]?.id || null);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ siteName, rooms }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${siteName || 'gencho-note'}-data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="brand"><Home size={20}/> Gencho Note 図面モード</div>
          <input className="siteInput" value={siteName} onChange={e => setSiteName(e.target.value)} />
        </div>
        <button className="iconBtn" onClick={exportJson}><Download size={18}/>保存出力</button>
      </header>

      <main className="layout">
        <aside className="sidebar">
          <button className="addRoom" onClick={() => setShowAdd(true)}><Plus size={18}/>部屋追加</button>
          <div className="roomList">
            {rooms.map(room => (
              <button key={room.id} className={`roomCard ${room.id === activeRoom.id ? 'active' : ''}`} onClick={() => setActiveRoomId(room.id)}>
                <span>{room.name}</span>
                <small>{room.width}×{room.depth}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="workspace">
          <div className="roomHeader">
            <input className="roomName" value={activeRoom.name} onChange={e => updateRoom({ name: e.target.value })} />
            <button className="danger" onClick={() => deleteRoom(activeRoom.id)}><Trash2 size={16}/>削除</button>
          </div>

          <div className="tabs">
            <button className={tab === 'plan' ? 'on' : ''} onClick={() => setTab('plan')}><Square size={16}/>図面</button>
            <button className={tab === 'freehand' ? 'on' : ''} onClick={() => setTab('freehand')}><Wand2 size={16}/>フリーハンド</button>
            <button className={tab === 'photos' ? 'on' : ''} onClick={() => setTab('photos')}><Camera size={16}/>写真</button>
            <button className={tab === 'memo' ? 'on' : ''} onClick={() => setTab('memo')}><StickyNote size={16}/>メモ</button>
          </div>

          {tab === 'plan' && <PlanEditor room={activeRoom} updateRoom={updateRoom} />}
          {tab === 'freehand' && <FreehandCanvas room={activeRoom} updateRoom={updateRoom} />}
          {tab === 'photos' && <PhotoPanel room={activeRoom} updateRoom={updateRoom} />}
          {tab === 'memo' && <MemoPanel room={activeRoom} updateRoom={updateRoom} />}
        </section>
      </main>

      {showAdd && <div className="modalBackdrop" onClick={() => setShowAdd(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modalTitle">部屋テンプレート</div>
          <div className="templateGrid">
            {ROOM_TYPES.map(t => <button key={t} onClick={() => addRoom(t)}>{t}</button>)}
          </div>
          <button className="closeBtn" onClick={() => setShowAdd(false)}><X size={16}/>閉じる</button>
        </div>
      </div>}
    </div>
  );
}

function PlanEditor({ room, updateRoom }) {
  const [selectedWall, setSelectedWall] = useState('下');
  const [partType, setPartType] = useState('ドア');
  const [partName, setPartName] = useState('片開き');
  const [partW, setPartW] = useState(750);
  const [partH, setPartH] = useState(2000);
  const [partMemo, setPartMemo] = useState('');

  const addPart = () => {
    const part = { id: uid(), type: partType, name: partName, wall: selectedWall, width: Number(partW), height: Number(partH), memo: partMemo };
    updateRoom({ parts: [...room.parts, part] });
    setPartMemo('');
  };

  const removePart = (id) => updateRoom({ parts: room.parts.filter(p => p.id !== id) });

  return <div className="panel twoCol">
    <div className="canvasCard">
      <div className="dimensionRow">
        <label>幅<input type="number" value={room.width} onChange={e => updateRoom({ width: Number(e.target.value) })}/></label>
        <label>奥行<input type="number" value={room.depth} onChange={e => updateRoom({ depth: Number(e.target.value) })}/></label>
        <label>高さ<input type="number" value={room.height} onChange={e => updateRoom({ height: Number(e.target.value) })}/></label>
      </div>
      <RoomBox room={room} selectedWall={selectedWall} setSelectedWall={setSelectedWall} />
      <p className="hint">壁をタップして、ドア・窓・収納を配置。寸法はレーザーで測った数字を入力。</p>
    </div>

    <div className="sidePanel">
      <h3>パーツ追加</h3>
      <label>壁<select value={selectedWall} onChange={e => setSelectedWall(e.target.value)}>{['上','右','下','左'].map(w => <option key={w}>{w}</option>)}</select></label>
      <label>種別<select value={partType} onChange={e => setPartType(e.target.value)}>{PART_TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
      <label>詳細<input value={partName} onChange={e => setPartName(e.target.value)} placeholder="片開き / 引違い / CL" /></label>
      <label>幅<input type="number" value={partW} onChange={e => setPartW(e.target.value)} /></label>
      <label>高さ<input type="number" value={partH} onChange={e => setPartH(e.target.value)} /></label>
      <label>メモ<textarea value={partMemo} onChange={e => setPartMemo(e.target.value)} placeholder="枠内、吊元、クレセント高さなど" /></label>
      <button className="primary" onClick={addPart}><DoorOpen size={16}/>追加</button>

      <h3>登録済み</h3>
      <div className="partList">
        {room.parts.map(p => <div className="partItem" key={p.id}>
          <div><b>{p.wall}壁：{p.type}</b><br/><small>{p.name} {p.width}×{p.height}</small>{p.memo && <p>{p.memo}</p>}</div>
          <button onClick={() => removePart(p.id)}><Trash2 size={14}/></button>
        </div>)}
      </div>
    </div>
  </div>
}

function RoomBox({ room, selectedWall, setSelectedWall }) {
  const wallParts = wall => room.parts.filter(p => p.wall === wall);
  return <div className="roomBoxWrap">
    <button className={`wall wallTop ${selectedWall === '上' ? 'sel' : ''}`} onClick={() => setSelectedWall('上')}>{room.width}</button>
    <button className={`wall wallRight ${selectedWall === '右' ? 'sel' : ''}`} onClick={() => setSelectedWall('右')}>{room.depth}</button>
    <button className={`wall wallBottom ${selectedWall === '下' ? 'sel' : ''}`} onClick={() => setSelectedWall('下')}>{room.width}</button>
    <button className={`wall wallLeft ${selectedWall === '左' ? 'sel' : ''}`} onClick={() => setSelectedWall('左')}>{room.depth}</button>
    <div className="roomBox">
      <div className="partLayer top">{wallParts('上').map(p => <span key={p.id}>{p.type}</span>)}</div>
      <div className="partLayer right">{wallParts('右').map(p => <span key={p.id}>{p.type}</span>)}</div>
      <div className="partLayer bottom">{wallParts('下').map(p => <span key={p.id}>{p.type}</span>)}</div>
      <div className="partLayer left">{wallParts('左').map(p => <span key={p.id}>{p.type}</span>)}</div>
      <strong>{room.name}</strong>
    </div>
  </div>
}

function FreehandCanvas({ room, updateRoom }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    if (room.freehand) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = room.freehand;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [room.id]);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const t = e.touches?.[0] || e;
    return { x: (t.clientX - rect.left) * (canvasRef.current.width / rect.width), y: (t.clientY - rect.top) * (canvasRef.current.height / rect.height) };
  };
  const start = e => { e.preventDefault(); drawing.current = true; const p = pos(e); const ctx = canvasRef.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = e => { if (!drawing.current) return; e.preventDefault(); const p = pos(e); const ctx = canvasRef.current.getContext('2d'); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const end = () => { drawing.current = false; updateRoom({ freehand: canvasRef.current.toDataURL('image/png') }); };
  const clear = () => { const c = canvasRef.current; c.getContext('2d').clearRect(0,0,c.width,c.height); updateRoom({ freehand: null }); };
  const download = () => { const a = document.createElement('a'); a.href = canvasRef.current.toDataURL('image/png'); a.download = `${room.name}-freehand.png`; a.click(); };

  return <div className="panel">
    <div className="freehandToolbar">
      <button onClick={clear}><Eraser size={16}/>消す</button>
      <button onClick={download}><Download size={16}/>画像保存</button>
      <span>補正なし。変形間取り・配管位置・注意点の保険用。</span>
    </div>
    <canvas ref={canvasRef} className="freehandCanvas" width="1200" height="800" onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end} onTouchStart={start} onTouchMove={move} onTouchEnd={end}/>
  </div>
}

function PhotoPanel({ room, updateRoom }) {
  const addPhotos = async (files) => {
    const list = await Promise.all([...files].map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({ id: uid(), name: file.name || `${room.name}-photo.jpg`, data: reader.result, memo: '' });
      reader.readAsDataURL(file);
    })));
    updateRoom({ photos: [...room.photos, ...list] });
  };
  const removePhoto = id => updateRoom({ photos: room.photos.filter(p => p.id !== id) });

  return <div className="panel">
    <div className="photoActions">
      <label className="primary fileBtn"><Camera size={16}/>カメラで撮影<input type="file" accept="image/*" capture="environment" multiple onChange={e => addPhotos(e.target.files)} /></label>
      <label className="fileBtn"><Upload size={16}/>写真を選択<input type="file" accept="image/*" multiple onChange={e => addPhotos(e.target.files)} /></label>
      <p>撮影写真はアプリ内に保存。必要な写真は各画像の「保存」で端末側にも残せます。</p>
    </div>
    <div className="photoGrid">
      {room.photos.map(photo => <div className="photoCard" key={photo.id}>
        <img src={photo.data} />
        <div className="photoBtns">
          <a download={`${room.name}-${photo.id}.jpg`} href={photo.data}><Download size={14}/>保存</a>
          <button onClick={() => removePhoto(photo.id)}><Trash2 size={14}/></button>
        </div>
      </div>)}
      {!room.photos.length && <div className="empty"><ImageIcon/>写真なし</div>}
    </div>
  </div>
}

function MemoPanel({ room, updateRoom }) {
  return <div className="panel memoPanel">
    <div className="audioNote"><Mic size={18}/> 明日は純正録音アプリを部屋ごとに分けて録音。ここに録音ファイル名や要点をメモ。</div>
    <textarea value={room.notes} onChange={e => updateRoom({ notes: e.target.value })} placeholder="浴室：入口枠交換、窓そのまま、天井高2400…" />
  </div>
}

createRoot(document.getElementById('root')).render(<App />);
