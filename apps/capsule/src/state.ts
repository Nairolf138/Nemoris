import type { AuthSessionResponse, CapsuleCollections, ExportJob } from './models/contracts.js';

export interface CapsuleState {
  session: AuthSessionResponse | null;
  onboardingCompleted: boolean;
  data: CapsuleCollections;
  exports: ExportJob[];
  ui: {
    loading: boolean;
    error?: string;
  };
}

export interface CapsuleStatePatch {
  session?: CapsuleState['session'];
  onboardingCompleted?: boolean;
  data?: Partial<CapsuleCollections>;
  exports?: ExportJob[];
  ui?: Partial<CapsuleState['ui']>;
}

export type StateListener = (state: CapsuleState) => void;

export class CapsuleStore {
  private listeners = new Set<StateListener>();
  private state: CapsuleState;

  public constructor(initialState: Partial<CapsuleState> = {}) {
    this.state = {
      session: null,
      onboardingCompleted: false,
      data: {
        memories: [],
        beliefs: [],
        lessons: [],
        valueProfiles: [],
        legacyMessages: [],
        narrativeNodes: [],
        narrativeEdges: [],
      },
      exports: [],
      ui: { loading: false },
      ...initialState,
    };
  }

  public getState(): CapsuleState {
    return this.state;
  }

  public setState(patch: CapsuleStatePatch): CapsuleState {
    this.state = {
      ...this.state,
      ...patch,
      ui: {
        ...this.state.ui,
        ...(patch.ui ?? {}),
      },
      data: {
        ...this.state.data,
        ...(patch.data ?? {}),
      },
    };
    this.listeners.forEach((listener) => listener(this.state));
    return this.state;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
