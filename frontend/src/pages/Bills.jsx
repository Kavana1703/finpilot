import { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import { getBills, createBill, setParticipantPaid, deleteBill } from "../api/bills";

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [participantNames, setParticipantNames] = useState(["", ""]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBills(await getBills());
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load bills");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateParticipant(index, value) {
    const next = [...participantNames];
    next[index] = value;
    setParticipantNames(next);
  }

  function addParticipantField() {
    setParticipantNames([...participantNames, ""]);
  }

  function removeParticipantField(index) {
    setParticipantNames(participantNames.filter((_, i) => i !== index));
  }

  function resetForm() {
    setName("");
    setTotalAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setParticipantNames(["", ""]);
    setShowForm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const participants = participantNames
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n) => ({ name: n }));

    if (participants.length < 1) {
      setError("Add at least one participant");
      return;
    }

    try {
      await createBill({
        name,
        total_amount: parseFloat(totalAmount),
        date,
        participants,
      });
      resetForm();
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save bill");
    }
  }

  async function togglePaid(bill, participant) {
    await setParticipantPaid(bill.id, participant.id, !participant.paid);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this bill?")) return;
    await deleteBill(id);
    load();
  }

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">👥 Bill Splitter</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Split a Bill
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              required
              placeholder="Bill name (e.g. Restaurant Bill)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.01"
              required
              placeholder="Total amount (₹)"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-gray-500">Participants</label>
            <div className="space-y-2">
              {participantNames.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder={`Person ${i + 1}`}
                    value={p}
                    onChange={(e) => updateParticipant(i, e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  {participantNames.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParticipantField(i)}
                      className="rounded-lg px-3 text-sm text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addParticipantField}
              className="mt-2 text-sm text-brand-600 hover:underline"
            >
              + Add another person
            </button>
          </div>

          {totalAmount && participantNames.filter((p) => p.trim()).length > 0 && (
            <p className="text-sm text-gray-500">
              Each person pays ≈ ₹
              {(
                parseFloat(totalAmount || 0) /
                Math.max(1, participantNames.filter((p) => p.trim()).length)
              ).toFixed(2)}
            </p>
          )}

          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Split Bill
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 space-y-4">
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : bills.length === 0 ? (
          <p className="text-gray-400">No bills split yet.</p>
        ) : (
          bills.map((bill) => {
            const paidCount = bill.participants.filter((p) => p.paid).length;
            return (
              <div key={bill.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{bill.name}</p>
                    <p className="text-xs text-gray-500">
                      {bill.date} · ₹{bill.total_amount.toLocaleString("en-IN")} total ·{" "}
                      {paidCount}/{bill.participants.length} paid
                    </p>
                  </div>
                  <button onClick={() => handleDelete(bill.id)} className="text-xs text-red-600 hover:underline">
                    Delete
                  </button>
                </div>

                <div className="mt-3 divide-y divide-gray-100">
                  {bill.participants.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-gray-700">{p.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">₹{p.share_amount.toLocaleString("en-IN")}</span>
                        <button
                          onClick={() => togglePaid(bill, p)}
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            p.paid
                              ? "bg-brand-50 text-brand-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {p.paid ? "Paid ✅" : "Not Paid ❌"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Layout>
  );
}
