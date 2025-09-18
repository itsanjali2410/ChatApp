// app/admin/page.tsx
"use client";
import { useEffect, useState } from "react";
import axios from "../../utils/api";

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "" });
  const [inviteToken, setInviteToken] = useState<string>("");
  const [orgId, setOrgId] = useState<string>("");

  useEffect(() => {
    const fetchUsers = async () => {
      const localOrgId = localStorage.getItem("org_id") || "";
      setOrgId(localOrgId);
      const res = await axios.get(`/users/admin/by_org?org_id=${localOrgId}`);
      setUsers(res.data);
    };
    fetchUsers();
  }, []);

  const handleGenerateInvite = async () => {
    const res = await axios.post(`/organization/invite?org_id=${orgId}`);
    setInviteToken(res.data.invite_token);
  };

  const addUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) return;
    await axios.post(`/users/admin/create`, newUser);
    setNewUser({ username: "", email: "", password: "" });
    const res = await axios.get(`/users/admin/by_org?org_id=${orgId}`);
    setUsers(res.data);
  };

  const deleteUser = async (email: string) => {
    await axios.delete(`/users/admin/${email}`);
    const res = await axios.get(`/users/admin/by_org?org_id=${orgId}`);
    setUsers(res.data);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Organization</h1>
      <div className="mb-6 p-4 bg-white rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Organization Invites</h2>
        <button onClick={handleGenerateInvite} className="px-4 py-2 bg-blue-600 text-white rounded">Generate Invite</button>
        {inviteToken && (
          <div className="mt-3">
            <div className="text-sm text-gray-700">Invite Token:</div>
            <code className="break-all">{inviteToken}</code>
            <div className="text-sm text-gray-700 mt-2">Share signup link:</div>
            <code className="break-all">{`${typeof window !== 'undefined' ? window.location.origin : ''}/signup?org=${orgId}&token=${inviteToken}`}</code>
          </div>
        )}
      </div>
      <div className="mb-6 p-4 bg-white rounded shadow">
        <h2 className="text-lg font-semibold mb-3">Add User</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="border rounded px-3 py-2" placeholder="Username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
          <button className="bg-blue-600 text-white rounded px-4" onClick={addUser}>Create</button>
        </div>
      </div>
      <h2 className="text-xl font-semibold mb-2">Users in your organization:</h2>
      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u._id} className="p-2 bg-white shadow rounded">
            <div className="flex items-center justify-between">
              <span>{u.username || u.name} ({u.email})</span>
              <button className="text-red-600" onClick={() => deleteUser(u.email)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
