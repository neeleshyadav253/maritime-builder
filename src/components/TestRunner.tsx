import { useState } from "react";

interface TestRunnerProps {
  onRunTest: (testCase: number, autoExecute: boolean) => void;
  isTestRunning: boolean;
}

export function TestRunner({ onRunTest, isTestRunning }: TestRunnerProps) {
  const [activeTest, setActiveTest] = useState<number | null>(null);

  const testCases = [
    {
      id: 1,
      name: "Mode 1: Direct Start Failure",
      description: "Auto: Trip with DO32 closed, battery drain to failure",
      duration: "~15 seconds",
      steps: [
        "Reset simulator",
        "DO32: CLOSED",
        "Auto-press START 5 times",
        "Monitor trips and battery drain",
        "Verify Fail to Start at 14V",
      ],
    },
    {
      id: 2,
      name: "Mode 2: Normal Start",
      description: "Auto: Ramp up with DO32 open, manual ACB close",
      duration: "~50 seconds",
      steps: [
        "Reset simulator",
        "DO32: OPENED",
        "Auto-start engine",
        "Monitor ramp (0s→45s→200s)",
        "Auto-close ACB at 50s",
      ],
    },
    {
      id: 3,
      name: "Mode 3: Test Mode OFF Failure",
      description: "Auto: Battery drain with Test Mode OFF",
      duration: "~15 seconds",
      steps: [
        "Reset simulator",
        "Test Mode: OFF",
        "DO32: CLOSED",
        "Auto-press START 5 times",
        "Verify battery drain to failure",
      ],
    },
    {
      id: 4,
      name: "Mode 4: Fuel Drain",
      description: "Auto: DO44 drain, engine stop at low fuel",
      duration: "~60 seconds",
      steps: [
        "Reset simulator",
        "DO44: OPENED",
        "DO32: OPENED",
        "Auto-start engine",
        "Monitor fuel drain and auto-stop",
      ],
    },
    {
      id: 5,
      name: "Mode 5: Hydraulic Start",
      description: "Auto: Low battery hydraulic start with auto-ACB",
      duration: "~35 seconds",
      steps: [
        "Reset simulator",
        "Battery: Set to 14V",
        "DO32: OPENED",
        "Hydraulic: Set to 120 psi",
        "Auto-start via HY31",
        "Monitor auto-ACB close",
      ],
    },
  ];

  const handleRunTest = (testId: number) => {
    setActiveTest(testId);
    onRunTest(testId, true); // true = auto execute
  };

  return (
    <div className="p-4 border rounded-2xl border-slate-800 bg-slate-900/60">
      <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase text-slate-300">
        🤖 Automated Test Runner
      </h2>

      {isTestRunning && activeTest && (
        <div className="p-3 mb-4 border border-blue-700 rounded-lg bg-blue-900/30">
          <div className="flex items-center gap-2 text-sm text-blue-300">
            <div className="w-4 h-4 border-b-2 border-blue-300 rounded-full animate-spin"></div>
            🚀 Running Test {activeTest}:{" "}
            {testCases.find((t) => t.id === activeTest)?.name}
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {testCases.map((test) => (
          <div
            key={test.id}
            className="p-3 border border-slate-700 rounded-xl bg-slate-800/40"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 font-mono text-xs rounded bg-cyan-900 text-cyan-200">
                    Test {test.id}
                  </span>
                  <span className="px-2 py-1 text-xs text-purple-200 bg-purple-900 rounded">
                    {test.duration}
                  </span>
                </div>
                <h3 className="mb-1 text-sm font-medium">{test.name}</h3>
                <p className="mb-2 text-xs text-gray-400">{test.description}</p>
                <ul className="space-y-1 text-xs text-gray-300">
                  {test.steps.map((step, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handleRunTest(test.id)}
                disabled={isTestRunning}
                className={`ml-4 rounded-xl px-4 py-2 text-xs font-medium transition ${
                  isTestRunning
                    ? "bg-gray-600 cursor-not-allowed opacity-50"
                    : "bg-emerald-700 hover:bg-emerald-600"
                }`}
              >
                {isTestRunning && activeTest === test.id
                  ? "Running..."
                  : "Run Auto Test"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 mt-3 border border-green-700 rounded-lg bg-green-900/20">
        <div className="text-xs text-green-200">
          🎯 <strong>Fully Automated:</strong> Click any test and watch it
          execute automatically from start to finish!
        </div>
      </div>
    </div>
  );
}
