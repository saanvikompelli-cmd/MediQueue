import React, { useEffect, useMemo, useState } from 'react'
import { Activity, LayoutDashboard, Users, Stethoscope, CalendarDays, Ticket, History, Search, Bell, Plus, ArrowUpRight, Clock3, CheckCircle2, UserRound, LogOut, Menu, X, ChevronRight, Phone, Mail, Sparkles, RefreshCw, Play, Check, HeartPulse } from 'lucide-react'

const API = 'http://localhost:8000/api'
const today = new Date().toISOString().slice(0,10)
async function request(path, options={}) {
  const res = await fetch(API + path, { headers: {'Content-Type':'application/json'}, ...options })
  const data = await res.json().catch(()=>({detail:'Unexpected server response'}))
  if (!res.ok) throw new Error(data.detail || 'Request failed')
  return data
}
const money = n => String(n).padStart(2,'0')

export default function App() {
  const [page,setPage] = useState('Overview')
  const [role,setRole] = useState('Admin')
  const [patients,setPatients] = useState([])
  const [doctors,setDoctors] = useState([])
  const [queue,setQueue] = useState([])
  const [history,setHistory] = useState([])
  const [stats,setStats] = useState({patients:0,doctors:0,appointments:0,waiting:0,completed:0})
  const [loading,setLoading] = useState(false)
  const [notice,setNotice] = useState('')
  const [error,setError] = useState('')
  const [search,setSearch] = useState('')
  const [showPatient,setShowPatient] = useState(false)
  const [showBooking,setShowBooking] = useState(false)
  const [patientForm,setPatientForm] = useState({full_name:'',age:'',phone:'',email:''})
  const [bookingForm,setBookingForm] = useState({patient_id:'',doctor_id:'',appointment_date:today,reason:'General consultation'})
  const [lastToken,setLastToken] = useState(null)
  const [mobileOpen,setMobileOpen] = useState(false)

  async function refresh() {
    try {
      const [p,d,q,h,s] = await Promise.all([
        request('/patients'), request('/doctors'), request('/queue'), request('/history'), request('/stats')
      ])
      setPatients(p); setDoctors(d); setQueue(q); setHistory(h); setStats(s)
    } catch(e) { setError('Cannot connect to the API. Start the Python backend in VS Code, then refresh this page.'); }
  }
  useEffect(()=>{ refresh(); const id=setInterval(refresh,5000); return ()=>clearInterval(id) },[])
  async function seed() {
    setError(''); setNotice('')
    try { await request('/demo/seed',{method:'POST'}); await refresh(); setNotice('Demo doctors loaded successfully.') }
    catch(e){setError(e.message)}
  }
  async function addPatient(e) {
    e.preventDefault(); setError(''); setNotice('')
    if (!/^[6-9][0-9]{9}$/.test(patientForm.phone)) {
      setError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.')
      return
    }
    try {
      await request('/patients',{method:'POST',body:JSON.stringify({...patientForm,age:Number(patientForm.age)})})
      setPatientForm({full_name:'',age:'',phone:'',email:''}); setShowPatient(false); await refresh(); setNotice('Patient registered successfully.')
    } catch(e){setError(e.message)}
  }
  async function book(e) {
    e.preventDefault(); setError(''); setNotice('')
    try {
      const result = await request('/appointments',{method:'POST',body:JSON.stringify({...bookingForm,patient_id:Number(bookingForm.patient_id),doctor_id:Number(bookingForm.doctor_id)})})
      setLastToken(result); setShowBooking(false); await refresh(); setNotice('Appointment booked and token generated.')
    } catch(e){setError(e.message)}
  }
  async function queueAction(id, action) {
    setError(''); setNotice('')
    try { await request(`/queue/${id}/${action}`,{method:'POST'}); await refresh(); setNotice(action==='call'?'Patient moved to serving.':'Consultation marked completed.') }
    catch(e){setError(e.message)}
  }
  const filteredPatients = patients.filter(p => `${p.full_name} ${p.email} ${p.phone}`.toLowerCase().includes(search.toLowerCase()))
  const nav = [
    {name:'Overview',icon:LayoutDashboard,group:'WORKSPACE'},
    {name:'Patients',icon:Users,group:'WORKSPACE'},
    {name:'Doctors',icon:Stethoscope,group:'WORKSPACE'},
    {name:'Appointments',icon:CalendarDays,group:'WORKSPACE'},
    {name:'Live Queue',icon:Ticket,group:'WORKSPACE'},
    {name:'Queue History',icon:History,group:'MANAGEMENT'}
  ]
  const activeQueue = queue.filter(x=>x.status==='WAITING'||x.status==='SERVING')
  const serving = activeQueue.find(x=>x.status==='SERVING')
  const waiting = activeQueue.filter(x=>x.status==='WAITING')
  const initials = name => name?.split(' ').slice(-2).map(x=>x[0]).join('').toUpperCase()
  const pageTitle = page==='Overview'?'Overview':page
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen?'open':''}`}>
      <div className="brand"><div className="brand-mark"><HeartPulse size={23}/></div><div><b>MediQueue</b><small>CARE, WITHOUT THE WAIT</small></div><button className="mobile-close" onClick={()=>setMobileOpen(false)}><X/></button></div>
      <div className="workspace"><span className="workspace-dot"></span><div><b>CityCare Hospital</b><small>Healthcare workspace</small></div><ChevronRight size={15}/></div>
      {['WORKSPACE','MANAGEMENT'].map(group=><div className="nav-group" key={group}><p>{group}</p>{nav.filter(n=>n.group===group).map(n=><button key={n.name} className={`nav-item ${page===n.name?'active':''}`} onClick={()=>{setPage(n.name);setMobileOpen(false)}}><n.icon size={18}/><span>{n.name}</span>{n.name==='Live Queue'&&<i>{waiting.length}</i>}</button>)}</div>)}
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Sparkles size={17}/></div><b>Need assistance?</b><span>Manage your clinic with ease.</span><button onClick={()=>setPage('Overview')}>Explore dashboard <ArrowUpRight size={14}/></button></div><div className="profile-mini"><div className="avatar admin">AD</div><div><b>Admin User</b><small>Administrator</small></div><LogOut size={16}/></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="hamburger" onClick={()=>setMobileOpen(true)}><Menu/></button><div className="crumb">Workspace <ChevronRight size={14}/> <b>{pageTitle}</b></div><div className="top-actions"><div className="live-indicator"><span/> System operational</div><button className="icon-btn" title="Notifications"><Bell size={18}/><i/></button><div className="top-user"><div className="avatar admin">AD</div><div><b>Admin User</b><small>Administrator</small></div></div></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow"><span/> HEALTHCARE OPERATIONS</div><h1>{page==='Overview'?'Good morning, Admin':pageTitle}<span className="wave">✦</span></h1><p>{page==='Overview'?'Here is what is happening at your hospital today.':'Manage your hospital operations from one place.'}</p></div><div className="heading-actions"><button className="btn secondary" onClick={refresh}><RefreshCw size={16}/> Refresh</button><button className="btn primary" onClick={()=>setShowBooking(true)}><Plus size={17}/> New appointment</button></div></div>
        {error&&<div className="alert error">{error}<button onClick={()=>setError('')}>×</button></div>}
        {notice&&<div className="alert success"><CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice('')}>×</button></div>}
        <div className="role-strip"><span>Preview dashboard as</span>{['Admin','Doctor','Patient'].map(r=><button key={r} className={role===r?'selected':''} onClick={()=>setRole(r)}>{r}</button>)}<span className="role-note">Role preview for expo demonstration</span></div>
        {page==='Overview'&&<>
          <div className="stat-grid">
            <Stat label="Total patients" value={stats.patients} note="Registered in system" icon={Users} color="violet" trend="Live database"/>
            <Stat label="Available doctors" value={doctors.filter(d=>d.available).length} note="Ready for consultation" icon={Stethoscope} color="teal" trend={`${doctors.length} total doctors`}/>
            <Stat label="Appointments" value={stats.appointments} note="All booked appointments" icon={CalendarDays} color="blue" trend="All records"/>
            <Stat label="Waiting patients" value={stats.waiting} note="Currently in queue" icon={Clock3} color="amber" trend="Live queue"/>
          </div>
          <div className="dashboard-grid">
            <section className="panel queue-panel"><div className="panel-head"><div><h3>Live patient queue</h3><p>Real-time overview of waiting patients</p></div><button className="text-link" onClick={()=>setPage('Live Queue')}>View queue <ArrowUpRight size={15}/></button></div>
              <div className="queue-highlight"><div><span className="tiny-label">NOW SERVING</span><h2>{serving?`Token #${money(serving.token_number)}`:'No active patient'}</h2><p>{serving?serving.patient_name:'Doctor is ready for the next patient'}</p></div><div className="serving-pulse"><Activity size={23}/></div></div>
              <div className="queue-summary"><div><b>{waiting.length}</b><span>Waiting</span></div><div><b>{serving?1:0}</b><span>In consultation</span></div><div><b>{stats.completed}</b><span>Completed</span></div></div>
              <div className="table-wrap"><table><thead><tr><th>TOKEN</th><th>PATIENT</th><th>DOCTOR</th><th>STATUS</th></tr></thead><tbody>{activeQueue.slice(0,5).map(q=><tr key={q.token_id}><td><b className="token-pill">#{money(q.token_number)}</b></td><td>{q.patient_name}</td><td>{q.doctor_name}</td><td><Status status={q.status}/></td></tr>)}{!activeQueue.length&&<tr><td colSpan="4" className="empty">No active queue. Book an appointment to get started.</td></tr>}</tbody></table></div>
            </section>
            <section className="panel quick-panel"><div className="panel-head"><div><h3>Quick actions</h3><p>Common hospital operations</p></div><Sparkles size={18} className="muted-icon"/></div><button className="quick-action" onClick={()=>setShowPatient(true)}><div className="quick-icon purple"><UserRound/></div><span><b>Register patient</b><small>Add a new patient record</small></span><ChevronRight/></button><button className="quick-action" onClick={()=>setShowBooking(true)}><div className="quick-icon blue"><CalendarDays/></div><span><b>Book appointment</b><small>Schedule a consultation</small></span><ChevronRight/></button><button className="quick-action" onClick={()=>setPage('Live Queue')}><div className="quick-icon green"><Ticket/></div><span><b>Manage queue</b><small>Call and complete tokens</small></span><ChevronRight/></button><button className="quick-action" onClick={seed}><div className="quick-icon amber"><Sparkles/></div><span><b>Load demo doctors</b><small>Prepare sample data</small></span><ChevronRight/></button></section>
          </div>
          <section className="panel bottom-panel"><div className="panel-head"><div><h3>Doctor availability</h3><p>Current consultation availability</p></div><button className="text-link" onClick={()=>setPage('Doctors')}>All doctors <ArrowUpRight size={15}/></button></div><div className="doctor-grid">{doctors.slice(0,3).map(d=><DoctorCard key={d.doctor_id} doctor={d}/>) }{!doctors.length&&<div className="empty">Load demo doctors to see the doctor list.</div>}</div></section>
        </>}
        {page==='Patients'&&<section className="panel full-panel"><div className="panel-head"><div><h3>Patient directory</h3><p>All registered patient records stored in MySQL</p></div><button className="btn primary" onClick={()=>setShowPatient(true)}><Plus size={16}/> Add patient</button></div><div className="table-tools"><div className="searchbox"><Search size={16}/><input placeholder="Search patients by name, email or phone..." value={search} onChange={e=>setSearch(e.target.value)}/></div><span>{filteredPatients.length} records</span></div><div className="table-wrap"><table><thead><tr><th>PATIENT</th><th>EMAIL</th><th>PHONE</th><th>AGE</th><th>RECORD ID</th></tr></thead><tbody>{filteredPatients.map(p=><tr key={p.patient_id}><td><div className="person-cell"><div className="avatar">{initials(p.full_name)}</div><b>{p.full_name}</b></div></td><td>{p.email}</td><td>{p.phone}</td><td>{p.age}</td><td>PT-{String(p.patient_id).padStart(4,'0')}</td></tr>)}{!filteredPatients.length&&<tr><td colSpan="5" className="empty">No patients found. Register your first patient.</td></tr>}</tbody></table></div></section>}
        {page==='Doctors'&&<section className="panel full-panel"><div className="panel-head"><div><h3>Medical team</h3><p>Doctors and their current availability</p></div><span className="count-badge">{doctors.length} doctors</span></div><div className="doctor-grid large">{doctors.map(d=><DoctorCard key={d.doctor_id} doctor={d}/>)}</div>{!doctors.length&&<div className="empty">Click “Load demo doctors” on Overview to add sample doctors.</div>}</section>}
        {page==='Appointments'&&<section className="panel full-panel"><div className="panel-head"><div><h3>Appointment records</h3><p>Appointments are linked to patients, doctors and tokens.</p></div><button className="btn primary" onClick={()=>setShowBooking(true)}><Plus size={16}/> New appointment</button></div><div className="table-wrap"><table><thead><tr><th>TOKEN</th><th>PATIENT</th><th>DOCTOR</th><th>DATE</th><th>REASON</th><th>STATUS</th></tr></thead><tbody>{queue.map(q=><tr key={q.token_id}><td><b className="token-pill">#{money(q.token_number)}</b></td><td>{q.patient_name}</td><td>{q.doctor_name}</td><td>{q.appointment_date}</td><td>{q.reason}</td><td><Status status={q.status}/></td></tr>)}{!queue.length&&<tr><td colSpan="6" className="empty">No active appointments currently.</td></tr>}</tbody></table></div></section>}
        {page==='Live Queue'&&<section className="panel full-panel"><div className="panel-head"><div><h3>Queue control center</h3><p>Call the next patient and update consultation status.</p></div><span className="live-indicator"><span/> Auto-refreshing</span></div><div className="queue-cards">{activeQueue.map(q=><div className="queue-card" key={q.token_id}><div className="queue-card-top"><b className="big-token">#{money(q.token_number)}</b><Status status={q.status}/></div><h3>{q.patient_name}</h3><p>{q.doctor_name} · {q.reason}</p><div className="queue-card-foot"><span><CalendarDays size={14}/> {q.appointment_date}</span><div>{q.status==='WAITING'&&<button className="btn primary small" onClick={()=>queueAction(q.token_id,'call')}><Play size={14}/> Call patient</button>}{q.status==='SERVING'&&<button className="btn success-btn small" onClick={()=>queueAction(q.token_id,'complete')}><Check size={14}/> Complete</button>}</div></div></div>)}{!activeQueue.length&&<div className="empty wide-empty">Your queue is clear. New bookings will appear here automatically.</div>}</div></section>}
        {page==='Queue History'&&<section className="panel full-panel"><div className="panel-head"><div><h3>Queue activity history</h3><p>Audit trail of token creation and consultation events</p></div><span className="count-badge">{history.length} events</span></div><div className="table-wrap"><table><thead><tr><th>EVENT</th><th>PATIENT</th><th>DOCTOR</th><th>TOKEN</th><th>TIME</th></tr></thead><tbody>{history.map(h=><tr key={h.history_id}><td><Status status={h.action}/></td><td>{h.patient_name}</td><td>{h.doctor_name}</td><td>#{money(h.token_number)}</td><td>{new Date(h.created_at).toLocaleString()}</td></tr>)}{!history.length&&<tr><td colSpan="5" className="empty">No queue history yet.</td></tr>}</tbody></table></div></section>}
        <footer className="footer"><span>© 2026 MediQueue Healthcare Systems</span><span><i/> Connected to live database · <b>MySQL</b></span></footer>
      </div>
    </main>
    {showPatient&&<Modal title="Register new patient" subtitle="Patient details will be saved in MySQL." close={()=>setShowPatient(false)}><form onSubmit={addPatient} className="form-grid"><label>Full name<input required minLength="2" value={patientForm.full_name} onChange={e=>setPatientForm({...patientForm,full_name:e.target.value})} placeholder="Enter patient name"/></label><label>Age<input required type="number" min="0" max="120" value={patientForm.age} onChange={e=>setPatientForm({...patientForm,age:e.target.value})} placeholder="Age"/></label><label>Phone number (+91)<input required type="tel" inputMode="numeric" autoComplete="tel-national" value={patientForm.phone} maxLength={10} minLength={10} pattern="[6-9][0-9]{9}" title="Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9" onChange={e=>setPatientForm({...patientForm,phone:e.target.value.replace(/\D/g,'').slice(0,10)})} placeholder="9876543210"/></label><label>Email address<input required type="email" value={patientForm.email} onChange={e=>setPatientForm({...patientForm,email:e.target.value})} placeholder="patient@email.com"/></label><div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setShowPatient(false)}>Cancel</button><button className="btn primary">Save patient <ArrowUpRight size={15}/></button></div></form></Modal>}
    {showBooking&&<Modal title="Book an appointment" subtitle="A unique queue token will be generated automatically." close={()=>setShowBooking(false)}><form onSubmit={book} className="form-grid"><label className="full">Select patient<select required value={bookingForm.patient_id} onChange={e=>setBookingForm({...bookingForm,patient_id:e.target.value})}><option value="">Choose registered patient</option>{patients.map(p=><option key={p.patient_id} value={p.patient_id}>{p.full_name} · {p.phone}</option>)}</select></label><label className="full">Select doctor<select required value={bookingForm.doctor_id} onChange={e=>setBookingForm({...bookingForm,doctor_id:e.target.value})}><option value="">Choose doctor</option>{doctors.filter(d=>d.available).map(d=><option key={d.doctor_id} value={d.doctor_id}>{d.full_name} · {d.specialization}</option>)}</select></label><label>Appointment date<input required type="date" min={today} value={bookingForm.appointment_date} onChange={e=>setBookingForm({...bookingForm,appointment_date:e.target.value})}/></label><label>Reason for visit<input value={bookingForm.reason} onChange={e=>setBookingForm({...bookingForm,reason:e.target.value})} placeholder="General consultation"/></label><div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setShowBooking(false)}>Cancel</button><button className="btn primary">Confirm booking <ArrowUpRight size={15}/></button></div></form></Modal>}
    {lastToken&&<Modal title="Appointment confirmed!" subtitle="The patient has been added to the doctor's queue." close={()=>setLastToken(null)}><div className="token-success"><div className="success-check"><CheckCircle2 size={28}/></div><span>YOUR QUEUE TOKEN</span><strong>#{money(lastToken.token_number)}</strong><b>{lastToken.patient_name}</b><p>{lastToken.doctor_name} · {lastToken.appointment_date}</p><button className="btn primary" onClick={()=>{setLastToken(null);setPage('Live Queue')}}>View live queue <ArrowUpRight size={15}/></button></div></Modal>}
  </div>
}
function Stat({label,value,note,icon:Icon,color,trend}){return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className={`stat-icon ${color}`}><Icon size={19}/></div></div><div className="stat-value">{value}</div><div className="stat-bottom"><span>{note}</span><small>{trend}</small></div></div>}
function Status({status}){let cls=['WAITING','TOKEN_CREATED'].includes(status)?'waiting':['SERVING','PATIENT_CALLED'].includes(status)?'serving':['COMPLETED','CONSULTATION_COMPLETED'].includes(status)?'completed':'neutral';let label=status.replaceAll('_',' ').toLowerCase();return <span className={`status ${cls}`}><i/>{label}</span>}
function DoctorCard({doctor}){return <div className="doctor-card"><div className="doctor-avatar">{doctor.full_name.split(' ').slice(-1)[0][0]}{doctor.full_name.split(' ')[1]?.[0]||''}</div><div className="doctor-info"><b>{doctor.full_name}</b><span>{doctor.specialization}</span><small><i className={doctor.available?'available':''}/>{doctor.available?'Available':'Unavailable'}</small></div><ChevronRight size={17}/></div>}
function Modal({title,subtitle,close,children}){return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&close()}><div className="modal"><div className="modal-head"><div><h2>{title}</h2><p>{subtitle}</p></div><button onClick={close}><X/></button></div>{children}</div></div>}
