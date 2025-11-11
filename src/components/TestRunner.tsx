interface TestRunnerProps {
  onRunTest: (testCase: number) => void;
}

export function TestRunner({ onRunTest }: TestRunnerProps) {
  const testCases = [
    {
      id: 1,
      name: "Mode 1: Direct Start Failure",
      description: "Trip with DO32 closed, battery drain",
    },
    {
      id: 2,
      name: "Mode 2: Normal Start",
      description: "Ramp up with DO32 open, manual ACB close",
    },
    {
      id: 3,
      name: "Mode 3: Test Mode OFF Failure",
      description: "Battery drain with Test Mode OFF",
    },
    {
      id: 4,
      name: "Mode 4: Fuel Drain",
      description: "DO44 drain, engine stop at low fuel",
    },
    {
      id: 5,
      name: "Mode 5: Hydraulic Start",
      description: "Low battery hydraulic start with auto-ACB",
    },
  ];

  return (
    <div className="p-4 border rounded-2xl border-slate-800 bg-slate-900/60">
      <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase text-slate-300">
        🧪 Test Runner
      </h2>
      <div className="grid gap-2">
        {testCases.map((test) => (
          <button
            key={test.id}
            onClick={() => onRunTest(test.id)}
            className="p-3 text-sm text-left transition rounded-xl bg-slate-800 hover:bg-slate-700"
          >
            <div className="font-medium">
              Test {test.id}: {test.name}
            </div>
            <div className="mt-1 text-xs text-gray-400">{test.description}</div>
          </button>
        ))}
      </div>
      <div className="mt-3 text-xs text-amber-300">
        💡 Click any test to see expected behavior. Reset between tests.
      </div>
    </div>
  );
}
