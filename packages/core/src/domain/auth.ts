export interface AuthUser {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  token: string;
  user_id: string;
  expires_at: string;
  revoked_at?: string;
}

export interface AuthContext {
  user: Pick<AuthUser, 'id' | 'email' | 'created_at' | 'updated_at'>;
  session: Session;
}
