import { Component, For, createMemo } from "solid-js";

export type PlanStatus = 'pending' | 'in_progress' | 'completed';

export interface SimplePlanStep {
  step: string;
  status: PlanStatus;
}

interface PlanDisplayProps {
  title?: string;
  steps: SimplePlanStep[];
  currentStep?: number;
  class?: string;
}

const CheckCircle: Component<{ class?: string }> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class={props.class}>
    <circle cx="12" cy="12" r="9" stroke-width="2" />
    <path d="M9 12l2 2 4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

const ArrowRight: Component<{ class?: string }> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class={props.class}>
    <path d="M5 12h14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M12 5l7 7-7 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

const Circle: Component<{ class?: string }> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class={props.class}>
    <circle cx="12" cy="12" r="9" stroke-width="2" />
  </svg>
);

const PlanDisplay: Component<PlanDisplayProps> = (props) => {
  // If currentStep not provided, infer from first in_progress
  const inferredCurrent = createMemo(() =>
    typeof props.currentStep === 'number' ? props.currentStep : props.steps.findIndex(s => s.status === 'in_progress')
  );

  const getStepIcon = (step: SimplePlanStep, index: number) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle class="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <ArrowRight class="w-4 h-4 text-blue-500" />;
      default:
        return (
          <Circle
            class={`w-4 h-4 ${index === inferredCurrent() ? 'text-blue-500' : 'text-gray-400'}`}
          />
        );
    }
  };

  const getStepColor = (step: SimplePlanStep, index: number) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-700 dark:text-green-300';
      case 'in_progress':
        return 'text-blue-700 dark:text-blue-300 font-medium';
      default:
        return index === inferredCurrent() ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div class={`plan-display bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg px-2 ${props.class ?? ''}`}>
      {/* Steps */}
      <div>
        <For each={props.steps}>{(step, idx) => {
          const i = idx();
          return (
            <div
              class={`flex items-start gap-3 p-1 rounded-md transition-colors ${
                i === inferredCurrent() ? 'bg-orange-100 dark:bg-orange-800/30' : 'hover:bg-orange-50 dark:hover:bg-orange-900/10'
              }`}
            >
              <div class="flex-shrink-0 mt-0.5">
                {getStepIcon(step, i)}
              </div>
              <div class="flex-1 min-w-0">
                <div class={`text-sm ${getStepColor(step, i)}`}>
                  <span class="font-medium">{i + 1}.</span> {step.step}
                </div>
              </div>
            </div>
          );
        }}</For>
      </div>
    </div>
  );
};

export default PlanDisplay;
