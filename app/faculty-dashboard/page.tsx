"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FacultyDashboard() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [students, setStudents] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/");
      return;
    }
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/faculty-subjects", {
      headers: { Authorization: "Bearer " + token },
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          router.push("/");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.subjects.length > 0) {
          setSubjects(data.subjects);
          setSelectedSubject(data.subjects[0]);
        }
      });
  }, [token, router]);

  useEffect(() => {
    if (!token || !selectedSubject) return;
    setMessage("");
    fetch("/api/students-list?semester=" + selectedSubject.semester, {
      headers: { Authorization: "Bearer " + token },
    })
      .then((res) => res.json())
      .then((data) => {
        setStudents(data.students || []);
        const initial: Record<number, string> = {};
        (data.students || []).forEach((s: any) => { initial[s.id] = "present"; });
        setStatuses(initial);
      });
  }, [token, selectedSubject]);

  function toggleStatus(id: number) {
    setStatuses((prev) => ({ ...prev, [id]: prev[id] === "present" ? "absent" : "present" }));
  }

  function markAll(status: "present" | "absent") {
    const updated: Record<number, string> = {};
    students.forEach((s) => { updated[s.id] = status; });
    setStatuses(updated);
  }

  async function submitAttendance() {
    setMessage("");
    if (!selectedSubject) return;
    const records = students.map((s) => ({ studentId: s.id, status: statuses[s.id] }));
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({
        subjectId: selectedSubject.id,
        date: today,
        records,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Attendance marked for " + data.count + " students");
    } else {
      setMessage(data.error || "Failed to mark attendance");
    }
  }

  if (token && subjects.length === 0) {
    return (
      <div className="min-h-screen bg-background text-text-secondary p-8">
        No subjects assigned to you yet. Contact your HOD.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <p className="text-lg font-medium text-text-primary mb-1">Mark attendance</p>
      <p className="text-sm text-text-secondary mb-6">{today}</p>

      <div className="flex gap-3 mb-6">
        <select
          value={selectedSubject?.id || ""}
          onChange={(e) => setSelectedSubject(subjects.find((s) => s.id === Number(e.target.value)))}
          className="px-3 py-2 rounded-lg bg-card border border-border-color text-text-primary text-sm"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.subject_name} (Sem {s.semester})</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 mb-4">
        <button
          onClick={() => markAll("present")}
          className="px-4 py-2 rounded-lg bg-success text-background text-sm font-medium"
        >
          Mark all present
        </button>
        <button
          onClick={() => markAll("absent")}
          className="px-4 py-2 rounded-lg bg-danger text-background text-sm font-medium"
        >
          Mark all absent
        </button>
      </div>

      <table className="w-full text-sm mb-6">
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-t border-border-color">
              <td className="py-2 text-text-primary">{s.name}</td>
              <td className="py-2 text-text-secondary">{s.reg_no}</td>
              <td className="py-2 text-right">
                <button
                  onClick={() => toggleStatus(s.id)}
                  className={
                    statuses[s.id] === "present"
                      ? "px-3 py-1 rounded-lg bg-success text-background text-xs"
                      : "px-3 py-1 rounded-lg bg-danger text-background text-xs"
                  }
                >
                  {statuses[s.id]}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={submitAttendance} className="px-6 py-2 rounded-lg bg-brand text-background font-medium">
        Submit attendance
      </button>

      {message && <p className="text-sm text-text-secondary mt-4">{message}</p>}
    </div>
  );
}
