"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type StuTab = "attendance" | "assignments";

export default function StudentDashboard() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<StuTab>("attendance");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignMsg, setAssignMsg] = useState("");
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/");
      return;
    }
    setToken(t);

    fetch("/api/student-attendance", {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem("token");
          router.push("/");
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json) setData(json);
      })
      .catch(() => setError("Failed to load attendance data"));

    loadAssignments(t);
  }, [router]);

  function loadAssignments(t: string) {
    fetch("/api/student-assignments", {
      headers: { Authorization: "Bearer " + t },
    })
      .then((res) => res.json())
      .then((json) => setAssignments(json.assignments || []))
      .catch(() => setAssignMsg("Failed to load assignments"));
  }

  useEffect(() => {
    if (token && tab === "assignments") loadAssignments(token);
  }, [token, tab]);

  async function handleSubmit(assignmentId: number) {
    if (!pendingFile) {
      setAssignMsg("Please choose a PDF file first");
      return;
    }
    setAssignMsg("");
    const formData = new FormData();
    formData.append("assignmentId", String(assignmentId));
    formData.append("pdf", pendingFile);

    const res = await fetch("/api/submit-assignment", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: formData,
    });
    const result = await res.json();
    if (!res.ok) {
      setAssignMsg(result.error || "Failed to submit assignment");
      return;
    }
    setAssignMsg("Assignment submitted successfully");
    setUploadingId(null);
    setPendingFile(null);
    if (token) loadAssignments(token);
  }

  function daysLeft(dueDate: string) {
    const due = new Date(dueDate);
    const now = new Date();
    due.setHours(23, 59, 59, 999);
    const diffMs = due.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  if (error) {
    return <div className="min-h-screen bg-background text-danger p-8">{error}</div>;
  }

  if (!data) {
    return <div className="min-h-screen bg-background text-text-primary p-8">Loading...</div>;
  }

  const chartData = data.subjectBreakdown.map((s: any) => ({
    name: s.subject.length > 10 ? s.subject.slice(0, 10) + "…" : s.subject,
    total: s.total,
    attended: s.present,
  }));

  const upcomingAssignments = assignments
    .filter((a: any) => a.due_date && !a.submission_id)
    .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setTab("attendance")}
          className={
            "px-4 py-2 rounded-lg text-sm font-medium " +
            (tab === "attendance" ? "bg-brand text-background" : "bg-card text-text-secondary")
          }
        >
          Attendance
        </button>
        <button
          onClick={() => setTab("assignments")}
          className={
            "px-4 py-2 rounded-lg text-sm font-medium " +
            (tab === "assignments" ? "bg-brand text-background" : "bg-card text-text-secondary")
          }
        >
          Assignments
        </button>
      </div>

      {tab === "attendance" && (
        <>
          <p className="text-lg font-medium text-text-primary mb-1">{data.name}</p>
          <p className="text-sm text-text-secondary mb-6">{data.regNo}</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-card rounded-lg p-4">
              <p className="text-sm text-text-secondary mb-1">Overall attendance</p>
              <p className="text-2xl font-medium text-text-primary">{data.overallPercent}%</p>
            </div>
            <div className="bg-card rounded-lg p-4">
              <p className="text-sm text-text-secondary mb-1">Classes attended</p>
              <p className="text-2xl font-medium text-text-primary">{data.attended} / {data.totalClasses}</p>
            </div>
            <div className="bg-card rounded-lg p-4">
              <p className="text-sm text-text-secondary mb-1">Subjects tracked</p>
              <p className="text-2xl font-medium text-text-primary">{data.subjectBreakdown.length}</p>
            </div>
          </div>

          <table className="w-full text-sm mb-8">
            <thead>
              <tr className="text-text-secondary text-left">
                <th className="pb-2 font-normal">Subject</th>
                <th className="pb-2 font-normal text-right">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {data.subjectBreakdown.map((row: any, i: number) => (
                <tr key={i} className="border-t border-border-color">
                  <td className="py-2 text-text-primary">{row.subject}</td>
                  <td className="py-2 text-right text-text-primary">{row.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          {chartData.length > 0 && (
            <div className="bg-card rounded-lg p-5 mb-8">
              <p className="text-sm font-medium text-text-primary mb-4">Classes attended vs total</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262A35" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#12141B", border: "1px solid #262A35", borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="total" name="Total classes" fill="#4B5563" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="attended" name="Attended" fill="#6366F1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-card rounded-lg p-5">
            <p className="text-sm font-medium text-text-primary mb-3">Upcoming assignments</p>
            {upcomingAssignments.length === 0 && (
              <p className="text-text-secondary text-sm">No upcoming assignments</p>
            )}
            <div className="flex flex-col gap-2">
              {upcomingAssignments.map((a: any) => {
                const left = daysLeft(a.due_date);
                return (
                  <div key={a.id} className="flex items-center justify-between py-2 border-t border-border-color first:border-t-0 first:pt-0">
                    <div>
                      <p className="text-sm text-text-primary">{a.title}</p>
                      <p className="text-xs text-text-secondary">{a.subject_name}</p>
                    </div>
                    <p className={"text-sm font-medium " + (left <= 1 ? "text-danger" : left <= 3 ? "text-warning" : "text-text-secondary")}>
                      {left < 0 ? "Overdue" : left === 0 ? "Due today" : left + " day" + (left === 1 ? "" : "s") + " left"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {tab === "assignments" && (
        <>
          <p className="text-lg font-medium text-text-primary mb-4">Assignments</p>
          {assignMsg && <p className="text-sm text-text-secondary mb-4">{assignMsg}</p>}

          <div className="flex flex-col gap-3 max-w-2xl">
            {assignments.length === 0 && (
              <p className="text-text-secondary text-sm">No assignments posted yet</p>
            )}
            {assignments.map((a: any) => {
              const isSubmitted = !!a.submission_id;
              const isOverdue = a.due_date && new Date(a.due_date) < new Date() && !isSubmitted;
              return (
                <div key={a.id} className="bg-card border border-border-color rounded-xl p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-text-primary font-medium">{a.title}</p>
                      <p className="text-xs text-text-secondary">{a.subject_name}</p>
                      {a.due_date && (
                        <p className={"text-xs mt-1 " + (isOverdue ? "text-danger" : "text-text-secondary")}>
                          Due: {new Date(a.due_date).toLocaleDateString()}
                        </p>
                      )}
                      {a.description && (
                        <p className="text-sm text-text-secondary mt-2">{a.description}</p>
                      )}
                    </div>

                    <a
                      href={"/api/assignment-pdf?id=" + a.id + "&token=" + token}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 rounded-lg bg-brand text-background text-xs font-medium whitespace-nowrap"
                    >
                      View PDF
                    </a>
                  </div>

                  {isSubmitted ? (
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-color">
                      <p className="text-xs text-success">
                        Submitted on {new Date(a.submitted_at).toLocaleString()}
                      </p>

                      <a
                        href={"/api/submission-pdf?id=" + a.submission_id + "&token=" + token}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 rounded-lg bg-card border border-border-color text-text-primary text-xs"
                      >
                        View my submission
                      </a>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-border-color">
                      {uploadingId === a.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
                            className="text-xs text-text-secondary flex-1"
                          />
                          <button
                            onClick={() => handleSubmit(a.id)}
                            className="px-3 py-1 rounded-lg bg-success text-background text-xs font-medium"
                          >
                            Submit
                          </button>
                          <button
                            onClick={() => { setUploadingId(null); setPendingFile(null); }}
                            className="px-3 py-1 rounded-lg bg-card border border-border-color text-text-secondary text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setUploadingId(a.id)}
                          className="px-3 py-1 rounded-lg bg-brand text-background text-xs font-medium"
                        >
                          Submit assignment
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}