import type { AuthSessionResponse, CapsuleCollections, ExportJob, OnboardingDraft, OnboardingStepKey } from './models/contracts.js';

export interface CapsuleState {
  session: AuthSessionResponse | null;
  onboardingCompleted: boolean;
  onboardingStep: OnboardingStepKey;
  onboardingDraft: OnboardingDraft;
  completedSteps: OnboardingStepKey[];
  data: CapsuleCollections;
  exports: ExportJob[];
  ui: {
    status: 'idle' | 'loading' | 'ready' | 'empty' | 'error';
    loading: boolean;
    error?: string;
    message?: string;
  };
}

export interface CapsuleStatePatch {
  session?: CapsuleState['session'];
  onboardingCompleted?: boolean;
  onboardingStep?: CapsuleState['onboardingStep'];
  onboardingDraft?: Partial<CapsuleState['onboardingDraft']>;
  completedSteps?: CapsuleState['completedSteps'];
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
      onboardingStep: 'identityContact',
      onboardingDraft: {
        identityContact: {
          identity: '',
          channel: 'email',
          contact: '',
        },
        messages: {
          title: '',
          message: '',
          triggerType: 'manual',
        },
        documents: {
          links: [],
        },
        beneficiariesRules: {
          beneficiaries: [],
          minimumBeneficiaries: 1,
        },
      },
      completedSteps: [],
      data: {
        memories: [],
        beliefs: [],
        lessons: [],
        valueProfiles: [],
        legacyMessages: [],
        beneficiaries: [],
        narrativeNodes: [],
        narrativeEdges: [],
      },
      exports: [],
      ui: { status: 'idle', loading: false },
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
      onboardingDraft: {
        ...this.state.onboardingDraft,
        ...(patch.onboardingDraft ?? {}),
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
