type UsersPanelProps = {
  users: string[];
};

export function UsersPanel({ users }: UsersPanelProps) {
  return (
    <aside className="users-panel">
      {users.map((user) => (
        <div key={user} className="user-item">
          {user}
        </div>
      ))}
    </aside>
  );
}
