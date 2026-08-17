"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, FileText } from "lucide-react";

type Tab = "attendance" | "assignments";

export default function FacultyDashboard() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("attendance");

  // ---- Attendance state ----
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [students, setStudents] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");

  // ---- Assignments state ----
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignSubjectId, setAssignSubjectId] = useState("");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDescription, setAssignDescription] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignFile, setAssignFile] = useState<File | null>(null);
  const [assignMsg, setAssignMsg] = useState("");
  const [posting, setPosting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState<Record<number, any[]>>({});
  const [submissionsLoading, setSubmissionsLoading] = useState<number | null>(null);

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
          setAssignSubjectId(String(data.subjects[0].id));
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

  function loadAssignments(t: string) {
    setAssignmentsLoading(true);
    fetch("/api/faculty-assignments", {
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
      .then((data) => {
        if (data) setAssignments(data.assignments || []);
      })
      .finally(() => setAssignmentsLoading(false));
  }

  useEffect(() => {
    if (token && tab === "assignments") loadAssignments(token);
  }, [token, tab]);

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

  async function handlePostAssignment(e: React.FormEvent) {
    e.preventDefault();
    setAssignMsg("");
    if (!assignSubjectId || !assignTitle || !assignFile) {
      setAssignMsg("Subject, title, and PDF are required");
      return;
    }
    if (assignFile.type !== "application/pdf") {
      setAssignMsg("Only PDF files are allowed");
      return;
    }
    setPosting(true);
    const formData = new FormData();
    formData.append("subjectId", assignSubjectId);
    formData.append("title", assignTitle);
    formData.append("description", assignDescription);
    formData.append("dueDate", assignDueDate);
    formData.append("pdf", assignFile);

    try {
      const res = await fetch("/api/add-assignment", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) {
        setAssignMsg(result.error || "Failed to post assignment");
        return;
      }
      setAssignMsg("Assignment posted successfully");
      setAssignTitle("");
      setAssignDescription("");
      setAssignDueDate("");
      setAssignFile(null);
      const fileInput = document.getElementById("assign-file-input") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      if (token) loadAssignments(token);
    } finally {
      setPosting(false);
    }
  }

  async function deleteAssignment(assignmentId: number) {
    if (!confirm("Delete this assignment? Student submissions for it will remain, but the assignment will disappear from their view. This cannot be undone.")) return;
    setAssignMsg("");
    const res = await fetch("/api/delete-assignment", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ assignmentId }),
    });
    const result = await res.json();
    if (!res.ok) {
      setAssignMsg(result.error || "Failed to delete assignment");
      return;
    }
    if (expandedId === assignmentId) setExpandedId(null);
    if (token) loadAssignments(token);
  }

  function toggleExpand(assignmentId: number) {
    if (expandedId === assignmentId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(assignmentId);
    if (!submissionsByAssignment[assignmentId] && token) {
      setSubmissionsLoading(assignmentId);
      fetch("/api/assignment-submissions?assignmentId=" + assignmentId, {
        headers: { Authorization: "Bearer " + token },
      })
        .then((res) => res.json())
        .then((data) => {
          setSubmissionsByAssignment((prev) => ({ ...prev, [assignmentId]: data.submissions || [] }));
        })
        .finally(() => setSubmissionsLoading(null));
    }
  }

  if (token && subjects.length === 0) {
    return (
      <div className="min-h-screen bg-background text-text-secondary p-8">
        No subjects assigned to you yet. Contact your HOD.
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "attendance", label: "Mark attendance", icon: ClipboardList },
    { key: "assignments", label: "Assignments", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="flex gap-2 mb-8 border-b border-border-color">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors " +
              (tab === key
                ? "border-brand text-text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary")
            }
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === "attendance" && (
        <>
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
        </>
      )}

      {tab === "assignments" && (
        <>
          <p className="text-lg font-medium text-text-primary mb-1">Assignments</p>
          <p className="text-sm text-text-secondary mb-6">Post new assignments and track submissions</p>

          <form
            onSubmit={handlePostAssignment}
            className="bg-card border border-border-color rounded-xl p-5 mb-8 max-w-xl"
          >
            <p className="text-sm font-medium text-text-primary mb-4">Post a new assignment</p>

            <label className="block text-xs text-text-secondary mb-1">Subject</label>
            <select
              value={assignSubjectId}
              onChange={(e) => setAssignSubjectId(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-lg bg-background border border-border-color text-text-primary text-sm outline-none focus:border-brand"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.subject_name} (Sem {s.semester})</option>
              ))}
            </select>

            <label className="block text-xs text-text-secondary mb-1">Title</label>
            <input
              type="text"
              value={assignTitle}
              onChange={(e) => setAssignTitle(e.target.value)}
              placeholder="e.g. Assignment 3 — Normalization"
              className="w-full mb-3 px-3 py-2 rounded-lg bg-background border border-border-color text-text-primary text-sm outline-none focus:border-brand"
            />

            <label className="block text-xs text-text-secondary mb-1">Description (optional)</label>
            <textarea
              value={assignDescription}
              onChange={(e) => setAssignDescription(e.target.value)}
              rows={3}
              placeholder="Instructions for students"
              className="w-full mb-3 px-3 py-2 rounded-lg bg-background border border-border-color text-text-primary text-sm outline-none focus:border-brand resize-none"
            />

            <label className="block text-xs text-text-secondary mb-1">Due date (optional)</label>
            <input
              type="date"
              value={assignDueDate}
              onChange={(e) => setAssignDueDate(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-lg bg-background border border-border-color text-text-primary text-sm outline-none focus:border-brand"
            />

            <label className="block text-xs text-text-secondary mb-1">PDF</label>
            <input
              id="assign-file-input"
              type="file"
              accept="application/pdf"
              onChange={(e) => setAssignFile(e.target.files?.[0] || null)}
              className="w-full mb-4 text-sm text-text-secondary file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-brand file:text-background file:text-xs file:font-medium"
            />

            <button
              type="submit"
              disabled={posting}
              className="px-5 py-2 rounded-lg bg-brand text-background text-sm font-medium disabled:opacity-50"
            >
              {posting ? "Posting..." : "Post assignment"}
            </button>

            {assignMsg && <p className="text-xs text-text-secondary mt-3">{assignMsg}</p>}
          </form>

          <p className="text-sm font-medium text-text-primary mb-3">Posted assignments</p>

          {assignmentsLoading && <p className="text-sm text-text-secondary">Loading...</p>}

          {!assignmentsLoading && assignments.length === 0 && (
            <p className="text-sm text-text-secondary">No assignments posted yet.</p>
          )}

          <div className="flex flex-col gap-3">
            {assignments.map((a) => (
              <div key={a.id} className="bg-card border border-border-color rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{a.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {a.subject_name}
                      {a.due_date ? " · Due " + new Date(a.due_date).toLocaleDateString() : ""}
                    </p>
                    {a.description && (
                      <p className="text-xs text-text-secondary mt-2">{a.description}</p>
                    )}
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-brand/15 text-brand text-xs font-medium">
                    {a.submission_count} submitted
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <a
                    href={"/api/assignment-pdf?id=" + a.id + "&token=" + token}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand font-medium hover:underline"
                  >
                    View PDF
                  </a>
                  <button
                    onClick={() => toggleExpand(a.id)}
                    className="text-xs text-text-secondary font-medium hover:text-text-primary"
                  >
                    {expandedId === a.id ? "Hide submissions" : "View submissions"}
                  </button>
                  <button
                    onClick={() => deleteAssignment(a.id)}
                    className="text-xs text-danger font-medium hover:underline ml-auto"
                  >
                    Delete
                  </button>
                </div>

                {expandedId === a.id && (
                  <div className="mt-3 pt-3 border-t border-border-color">
                    {submissionsLoading === a.id && (
                      <p className="text-xs text-text-secondary">Loading submissions...</p>
                    )}
                    {submissionsLoading !== a.id && (submissionsByAssignment[a.id]?.length ?? 0) === 0 && (
                      <p className="text-xs text-text-secondary">No submissions yet.</p>
                    )}
                    {submissionsLoading !== a.id && (submissionsByAssignment[a.id]?.length ?? 0) > 0 && (
                      <table className="w-full text-xs">
                        <tbody>
                          {submissionsByAssignment[a.id].map((sub) => (
                            <tr key={sub.id} className="border-t border-border-color first:border-t-0">
                              <td className="py-1.5 text-text-primary">{sub.name}</td>
                              <td className="py-1.5 text-text-secondary">{sub.reg_no}</td>
                              <td className="py-1.5 text-text-secondary">
                                {new Date(sub.submitted_at).toLocaleString()}
                              </td>
                              <td className="py-1.5 text-right">
                                <a
                                  href={"/api/submission-pdf?id=" + sub.id + "&token=" + token}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand font-medium hover:underline"
                                >
                                  View PDF
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}