"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BookPlus,
  UserPlus,
  GraduationCap,
  Percent,
  BookOpen,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Tab = "overview" | "add-subject" | "add-faculty" | "students" | "classes";

const SEMESTER = 2;

export default function HodDashboard() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [hodName, setHodName] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const [subjectName, setSubjectName] = useState("");
  const [subjectType, setSubjectType] = useState("theory");
  const [subjectFacultyId, setSubjectFacultyId] = useState("");
  const [subjectMsg, setSubjectMsg] = useState("");
  const [lookedUpFacultyName, setLookedUpFacultyName] = useState("");

  const [facultyId, setFacultyId] = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [facultyPassword, setFacultyPassword] = useState("");
  const [facultyMsg, setFacultyMsg] = useState("");
  const [facultyList, setFacultyList] = useState<any[]>([]);

  const [students, setStudents] = useState<any[]>([]);
  const [studentsMsg, setStudentsMsg] = useState("");

  const [classesSubject, setClassesSubject] = useState<number | null>(null);
  const [classesMonth, setClassesMonth] = useState(new Date().toISOString().slice(0, 7));
  const [classesData, setClassesData] = useState<any>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/");
      return;
    }
    setToken(t);
    try {
      const payload = JSON.parse(atob(t.split(".")[1]));
      setHodName(payload.name || "HOD");
    } catch {
      setHodName("HOD");
    }
  }, [router]);

  function loadData(t: string) {
    fetch("/api/hod-analytics?semester=" + SEMESTER, {
      headers: { Authorization: "Bearer " + t },
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          router.push("/");
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json) {
          setData(json);
          if (json.subjects.length > 0 && classesSubject === null) {
            setClassesSubject(json.subjects[0].id);
          }
        }
      })
      .catch(() => setError("Failed to load dashboard data"));
  }

  function loadStudents(t: string) {
    fetch("/api/students-list?semester=" + SEMESTER, {
      headers: { Authorization: "Bearer " + t },
    })
      .then((res) => res.json())
      .then((json) => setStudents(json.students || []))
      .catch(() => setStudentsMsg("Failed to load students"));
  }

  function loadFaculty(t: string) {
    fetch("/api/faculty-list", {
      headers: { Authorization: "Bearer " + t },
    })
      .then((res) => res.json())
      .then((json) => setFacultyList(json.faculty || []))
      .catch(() => {});
  }

  function loadClasses(t: string, subjectId: number, month: string) {
    fetch("/api/subject-attendance-log?subjectId=" + subjectId + "&month=" + month, {
      headers: { Authorization: "Bearer " + t },
    })
      .then((res) => res.json())
      .then((json) => setClassesData(json))
      .catch(() => {});
  }

  useEffect(() => {
    if (token) loadData(token);
  }, [token]);

  useEffect(() => {
    if (token && tab === "students") loadStudents(token);
  }, [token, tab]);

  useEffect(() => {
    if (token && tab === "add-faculty") loadFaculty(token);
  }, [token, tab]);

  useEffect(() => {
    if (token && tab === "classes" && classesSubject) {
      loadClasses(token, classesSubject, classesMonth);
    }
  }, [token, tab, classesSubject, classesMonth]);

  async function handleAddSubject(e: React.FormEvent) {
    e.preventDefault();
    setSubjectMsg("");
    const res = await fetch("/api/add-subject", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({
        subjectName,
        type: subjectType,
        semester: SEMESTER,
        facultyId: subjectFacultyId || null,
      }),
    });
    const result = await res.json();
    if (!res.ok) {
      setSubjectMsg(result.error || "Failed to add subject");
      return;
    }
    setSubjectMsg("Subject added successfully");
    setSubjectName("");
    setSubjectFacultyId("");
    if (token) loadData(token);
  }

  async function handleAddFaculty(e: React.FormEvent) {
    e.preventDefault();
    setFacultyMsg("");
    const res = await fetch("/api/add-faculty", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({
        facultyId,
        name: facultyName,
        password: facultyPassword,
      }),
    });
    const result = await res.json();
    if (!res.ok) {
      setFacultyMsg(result.error || "Failed to add faculty");
      return;
    }
    setFacultyMsg("Faculty added successfully");
    setFacultyId("");
    setFacultyName("");
    setFacultyPassword("");
    if (token) loadFaculty(token);
  }

  async function lookupFaculty(id: string) {
    setLookedUpFacultyName("");
    if (!id || !token) return;
    const res = await fetch("/api/lookup-faculty?facultyId=" + id, {
      headers: { Authorization: "Bearer " + token },
    });
    const result = await res.json();
    if (result.found) setLookedUpFacultyName(result.name);
  }

  async function toggleStatus(studentId: number, currentStatus: string) {
    const newStatus = currentStatus === "working" ? "active" : "working";
    setStudentsMsg("");
    const res = await fetch("/api/toggle-student-status", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ studentId, status: newStatus }),
    });
    if (!res.ok) {
      setStudentsMsg("Failed to update status");
      return;
    }
    if (token) loadStudents(token);
  }

  async function deleteSubject(subjectId: number) {
    if (!confirm("Delete this subject? This cannot be undone.")) return;
    setActionMsg("");
    const res = await fetch("/api/delete-subject", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ subjectId }),
    });
    const result = await res.json();
    if (!res.ok) {
      setActionMsg(result.error || "Failed to delete subject");
      return;
    }
    if (token) loadData(token);
  }

  async function deleteFaculty(facultyDbId: number) {
    if (!confirm("Delete this faculty account? This cannot be undone.")) return;
    setFacultyMsg("");
    const res = await fetch("/api/delete-faculty", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ facultyDbId }),
    });
    const result = await res.json();
    if (!res.ok) {
      setFacultyMsg(result.error || "Failed to delete faculty");
      return;
    }
    if (token) loadFaculty(token);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/");
  }

  function selectTab(t: Tab) {
    setTab(t);
    setSidebarOpen(false);
  }

  const inputStyle =
    "w-full mb-3 px-3 py-2.5 rounded-lg bg-[#0B0D12] border border-[#262A35] text-[#F3F4F6] text-sm outline-none focus:border-[#6366F1] transition-colors";

  const navItems: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "students", label: "Students", icon: Users },
    { key: "classes", label: "Classes", icon: CalendarDays },
    { key: "add-subject", label: "Add Subject", icon: BookPlus },
    { key: "add-faculty", label: "Add Faculty", icon: UserPlus },
  ];

  if (error) {
    return <div className="min-h-screen bg-[#0B0D12] text-[#EF4444] p-8">{error}</div>;
  }

  const chartData = data?.subjectBreakdown.map((s: any) => ({
    name: s.subject.length > 12 ? s.subject.slice(0, 12) + "…" : s.subject,
    percent: s.percent,
  })) || [];

  return (
    <div className="min-h-screen bg-[#0B0D12]">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#262A35] bg-[#12141B]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#6366F1] flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <p className="text-[#F3F4F6] font-semibold text-sm">Bima Attendance</p>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="text-[#F3F4F6] p-1">
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={
          "w-60 bg-[#12141B] border-r border-[#262A35] flex flex-col p-4 fixed h-screen z-50 transition-transform duration-200 " +
          (sidebarOpen ? "translate-x-0" : "-translate-x-full") +
          " md:translate-x-0"
        }
      >
        <div className="flex items-center justify-between px-2 mb-8 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#6366F1] flex items-center justify-center">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div>
              <p className="text-[#F3F4F6] font-semibold text-sm leading-tight">Bima Attendance</p>
              <p className="text-[#9CA3AF] text-xs leading-tight">HOD — {hodName} Sir</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-[#9CA3AF] p-1">
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => selectTab(key)}
              className={
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left " +
                (tab === key
                  ? "bg-[#6366F1] text-white"
                  : "text-[#9CA3AF] hover:bg-[#1B1E28] hover:text-[#F3F4F6]")
              }
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#9CA3AF] hover:bg-[#1B1E28] hover:text-[#EF4444] transition-colors"
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>

      {/* Main content */}
      <div className="md:ml-60 flex-1 p-4 md:p-8">
        {tab === "overview" && (
          <>
            {!data ? (
              <p className="text-[#9CA3AF]">Loading...</p>
            ) : (
              <>
                <p className="text-xl font-semibold text-[#F3F4F6] mb-1">Welcome, {hodName} Sir</p>
                <p className="text-sm text-[#9CA3AF] mb-6">MCA Department · Semester 2 Overview</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className="bg-[#161922] border border-[#262A35] rounded-xl p-5">
                    <div className="w-9 h-9 rounded-lg bg-[#6366F1]/15 flex items-center justify-center mb-3">
                      <Users size={18} className="text-[#6366F1]" />
                    </div>
                    <p className="text-[#9CA3AF] text-xs mb-1">Total students</p>
                    <p className="text-2xl font-semibold text-[#F3F4F6]">{data.totalStudents}</p>
                  </div>
                  <div className="bg-[#161922] border border-[#262A35] rounded-xl p-5">
                    <div className="w-9 h-9 rounded-lg bg-[#22C55E]/15 flex items-center justify-center mb-3">
                      <Percent size={18} className="text-[#22C55E]" />
                    </div>
                    <p className="text-[#9CA3AF] text-xs mb-1">Class average</p>
                    <p className="text-2xl font-semibold text-[#F3F4F6]">{data.classAverage}%</p>
                  </div>
                  <div className="bg-[#161922] border border-[#262A35] rounded-xl p-5">
                    <div className="w-9 h-9 rounded-lg bg-[#F59E0B]/15 flex items-center justify-center mb-3">
                      <BookOpen size={18} className="text-[#F59E0B]" />
                    </div>
                    <p className="text-[#9CA3AF] text-xs mb-1">Subjects</p>
                    <p className="text-2xl font-semibold text-[#F3F4F6]">{data.subjects.length}</p>
                  </div>
                </div>

                {chartData.length > 0 && (
                  <div className="bg-[#161922] border border-[#262A35] rounded-xl p-5 mb-8">
                    <p className="text-sm font-medium text-[#F3F4F6] mb-4">Attendance by subject</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262A35" vertical={false} />
                        <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} />
                        <YAxis stroke="#9CA3AF" fontSize={11} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{ background: "#12141B", border: "1px solid #262A35", borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: "#F3F4F6" }}
                        />
                        <Bar dataKey="percent" fill="#6366F1" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {actionMsg && <p className="text-xs text-[#EF4444] mb-2">{actionMsg}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#161922] border border-[#262A35] rounded-xl p-5">
                    <p className="text-sm font-medium text-[#F3F4F6] mb-3">Subjects</p>
                    <div className="flex flex-col gap-2">
                      {data.subjects.length === 0 && (
                        <p className="text-[#9CA3AF] text-sm">No subjects added yet</p>
                      )}
                      {data.subjects.map((row: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-2 border-t border-[#262A35] first:border-t-0 first:pt-0">
                          <div>
                            <p className="text-sm text-[#F3F4F6]">{row.name}</p>
                            <p className="text-xs text-[#9CA3AF]">{row.faculty}</p>
                          </div>
                          <button
                            onClick={() => deleteSubject(row.id)}
                            className="px-3 py-1 rounded-lg bg-[#EF4444]/15 text-[#EF4444] text-xs font-medium hover:bg-[#EF4444]/25 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#161922] border border-[#262A35] rounded-xl p-5">
                    <p className="text-sm font-medium text-[#F3F4F6] mb-3">Defaulters (below 75%)</p>
                    <div className="flex flex-col gap-2">
                      {data.defaulters.length === 0 && (
                        <p className="text-[#9CA3AF] text-sm">No defaulters</p>
                      )}
                      {data.defaulters.map((row: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-2 border-t border-[#262A35] first:border-t-0 first:pt-0">
                          <p className="text-sm text-[#F3F4F6]">{row.name}</p>
                          <p className="text-sm font-medium text-[#EF4444]">{row.percent}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab === "students" && (
          <>
            <p className="text-xl font-semibold text-[#F3F4F6] mb-6">Students</p>
            {studentsMsg && <p className="text-xs text-[#EF4444] mb-3">{studentsMsg}</p>}
            <div className="bg-[#161922] border border-[#262A35] rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#9CA3AF] text-left bg-[#12141B]">
                    <th className="px-5 py-3 font-medium">Reg no</th>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 && (
                    <tr><td className="px-5 py-4 text-[#9CA3AF]" colSpan={4}>No students yet</td></tr>
                  )}
                  {students.map((s: any) => (
                    <tr key={s.id} className="border-t border-[#262A35]">
                      <td className="px-5 py-3 text-[#F3F4F6] whitespace-nowrap">{s.reg_no}</td>
                      <td className="px-5 py-3 text-[#F3F4F6] whitespace-nowrap">{s.name}</td>
                      <td className="px-5 py-3">
                        <span className={
                          "px-2 py-0.5 rounded-full text-xs whitespace-nowrap " +
                          (s.status === "working" ? "bg-[#F59E0B]/15 text-[#F59E0B]" : "bg-[#22C55E]/15 text-[#22C55E]")
                        }>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => toggleStatus(s.id, s.status)}
                          className="px-3 py-1 rounded-lg bg-[#0B0D12] border border-[#262A35] text-[#F3F4F6] text-xs hover:border-[#6366F1] transition-colors whitespace-nowrap"
                        >
                          Mark as {s.status === "working" ? "active" : "working"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "classes" && (
          <>
            <p className="text-xl font-semibold text-[#F3F4F6] mb-6">Classes held</p>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <select
                value={classesSubject || ""}
                onChange={(e) => setClassesSubject(Number(e.target.value))}
                className="px-3 py-2.5 rounded-lg bg-[#161922] border border-[#262A35] text-[#F3F4F6] text-sm outline-none"
              >
                {data?.subjects.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input
                type="month"
                value={classesMonth}
                onChange={(e) => setClassesMonth(e.target.value)}
                className="px-3 py-2.5 rounded-lg bg-[#161922] border border-[#262A35] text-[#F3F4F6] text-sm outline-none"
              />
            </div>

            {classesData && (
              <>
                <div className="bg-[#161922] border border-[#262A35] rounded-xl p-5 mb-6 max-w-xs">
                  <div className="w-9 h-9 rounded-lg bg-[#6366F1]/15 flex items-center justify-center mb-3">
                    <CalendarDays size={18} className="text-[#6366F1]" />
                  </div>
                  <p className="text-[#9CA3AF] text-xs mb-1">Total classes this month</p>
                  <p className="text-2xl font-semibold text-[#F3F4F6]">{classesData.totalClassesHeld}</p>
                </div>

                <div className="bg-[#161922] border border-[#262A35] rounded-xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[#9CA3AF] text-left bg-[#12141B]">
                        <th className="px-5 py-3 font-medium">Date</th>
                        <th className="px-5 py-3 font-medium text-right">Present / Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classesData.log.length === 0 && (
                        <tr><td className="px-5 py-4 text-[#9CA3AF]" colSpan={2}>No classes held this month</td></tr>
                      )}
                      {classesData.log.map((row: any, i: number) => (
                        <tr key={i} className="border-t border-[#262A35]">
                          <td className="px-5 py-3 text-[#F3F4F6] whitespace-nowrap">{row.date}</td>
                          <td className="px-5 py-3 text-right text-[#F3F4F6] whitespace-nowrap">{row.present} / {row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {tab === "add-subject" && (
          <>
            <p className="text-xl font-semibold text-[#F3F4F6] mb-6">Add subject</p>
            <div className="max-w-sm bg-[#161922] border border-[#262A35] rounded-xl p-6">
              <form onSubmit={handleAddSubject}>
                <input placeholder="Subject name" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} className={inputStyle} />
                <select value={subjectType} onChange={(e) => setSubjectType(e.target.value)} className={inputStyle}>
                  <option value="theory">Theory</option>
                  <option value="lab">Lab</option>
                </select>
                <input
                  placeholder="Faculty ID (optional)"
                  value={subjectFacultyId}
                  onChange={(e) => {
                    setSubjectFacultyId(e.target.value);
                    lookupFaculty(e.target.value);
                  }}
                  className={inputStyle}
                />
                {subjectFacultyId && (
                  <p className="text-xs mb-3 -mt-2">
                    {lookedUpFacultyName ? (
                      <span className="text-[#22C55E]">Matched: {lookedUpFacultyName}</span>
                    ) : (
                      <span className="text-[#9CA3AF]">No faculty found with this ID</span>
                    )}
                  </p>
                )}
                {subjectMsg && <p className="text-xs text-[#9CA3AF] mb-2">{subjectMsg}</p>}
                <button type="submit" className="w-full py-2.5 rounded-lg bg-[#6366F1] text-white text-sm font-medium hover:bg-[#5457E5] transition-colors">
                  Add subject
                </button>
              </form>
            </div>
          </>
        )}

        {tab === "add-faculty" && (
          <>
            <p className="text-xl font-semibold text-[#F3F4F6] mb-6">Add faculty</p>
            <div className="max-w-sm bg-[#161922] border border-[#262A35] rounded-xl p-6 mb-8">
              <form onSubmit={handleAddFaculty}>
                <input placeholder="Faculty ID" value={facultyId} onChange={(e) => setFacultyId(e.target.value)} className={inputStyle} />
                <input placeholder="Full name" value={facultyName} onChange={(e) => setFacultyName(e.target.value)} className={inputStyle} />
                <input placeholder="Password" type="password" value={facultyPassword} onChange={(e) => setFacultyPassword(e.target.value)} className={inputStyle} />
                {facultyMsg && <p className="text-xs text-[#9CA3AF] mb-2">{facultyMsg}</p>}
                <button type="submit" className="w-full py-2.5 rounded-lg bg-[#6366F1] text-white text-sm font-medium hover:bg-[#5457E5] transition-colors">
                  Add faculty
                </button>
              </form>
            </div>

            <p className="text-sm font-medium text-[#F3F4F6] mb-3">All faculty</p>
            <div className="bg-[#161922] border border-[#262A35] rounded-xl overflow-x-auto max-w-lg">
              <table className="w-full text-sm">
                <tbody>
                  {facultyList.map((f: any) => (
                    <tr key={f.id} className="border-t border-[#262A35] first:border-t-0">
                      <td className="px-5 py-3 text-[#F3F4F6] whitespace-nowrap">{f.faculty_id}</td>
                      <td className="px-5 py-3 text-[#F3F4F6] whitespace-nowrap">{f.name}</td>
                      <td className="px-5 py-3 text-[#9CA3AF] whitespace-nowrap">{f.role}</td>
                      <td className="px-5 py-3 text-right">
                        {f.role !== "hod" && (
                          <button
                            onClick={() => deleteFaculty(f.id)}
                            className="px-3 py-1 rounded-lg bg-[#EF4444]/15 text-[#EF4444] text-xs font-medium hover:bg-[#EF4444]/25 transition-colors whitespace-nowrap"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}