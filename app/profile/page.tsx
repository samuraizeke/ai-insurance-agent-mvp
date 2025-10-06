import { db } from "@/lib/db";
import { fmt } from "@/lib/utils";

export default function ProfilePage() {
const p = db.profile;

return (
<div className="flex flex-col gap-6">
<div>
<h1 className="text-2xl font-semibold">Your Profile</h1>
<p className="text-sm text-gray-600">Basic personal info and policy on file.</p>
</div>

<section className="rounded-2xl border bg-white p-6 shadow-sm">
<h2 className="mb-2 text-lg font-medium">Personal Info</h2>
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
<Field label="Name" value={p.name} />
<Field label="Email" value={p.email} />
<Field label="Phone" value={p.phone || "—"} />
<Field label="Address" value={p.address || "—"} />
</div>
</section>

<section className="rounded-2xl border bg-white p-6 shadow-sm">
<h2 className="mb-2 text-lg font-medium">Policy</h2>
{!p.policy ? (
<div className="text-gray-600">No policy uploaded yet. Go to the Chat page to upload one.</div>
) : (
<div className="grid grid-cols-1 gap-2">
<Field label="File name" value={p.policy.name} />
<Field label="Type" value={p.policy.mime} />
<Field label="Size" value={`${Math.round(p.policy.size / 1024)} KB`} />
<Field label="Uploaded" value={fmt.date(p.policy.uploadedAt)} />
<div>
<a className="text-sm underline" href={p.policy.storedAt} target="_blank" rel="noreferrer">View / Download</a>
</div>
</div>
)}
</section>

<p className="text-xs text-gray-500">
Disclaimer: This MVP is for demonstration only and does not provide legal, financial, or insurance advice.
</p>
</div>
);
}

function Field({ label, value }: { label: string; value: string }) {
return (
<div>
<div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
<div className="text-sm">{value}</div>
</div>
);
}