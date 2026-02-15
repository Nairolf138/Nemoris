export interface AuthUser {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
  recovery_last_completed_at?: string;
  sensitive_action_unlocked_at?: string;
}

export interface Session {
  token: string;
  user_id: string;
  expires_at: string;
  revoked_at?: string;
}

export interface AuthContext {
  user: Pick<AuthUser, 'id' | 'email' | 'created_at' | 'updated_at' | 'recovery_last_completed_at' | 'sensitive_action_unlocked_at'>;
  session: Session;
}
