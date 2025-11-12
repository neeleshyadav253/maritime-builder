import React, { useEffect, useRef, useState } from "react";
import { Card } from "./Card";
import { Gauge } from "./Gauge";
import { Lamp } from "./Lamp";
import { Toggle } from "./Toggle";
import { INITIALS, fmt, interpRamp, RUNNING_PARAMS } from "../utils/constants";
import type { EngineState } from "../types";
import { TestRunner } from "./TestRunner"; // Add this import

export function EngineSimulator() {
  // Valves & Switches - ALL CLOSED initially
  const [DO32, setDO32] = useState(false); // Fuel valve to engine
  const [DO33, setDO33] = useState(false); // Fill valve to Emergency Gen DO tank
  const [DO44, setDO44] = useState(false); // Drain to storage
  const [HY31, setHY31] = useState(false); // Hydraulic start valve (momentary)
  const [testMode, setTestMode] = useState(true); // Test Mode ON initially
  const [acbClosed, setAcbClosed] = useState(false);
  const [shorePowerConnected, setShorePowerConnected] = useState(false);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<number | null>(null);
  const testActionQueue = useRef<
    Array<{ action: string; delay: number; data?: any }>
  >([]);
  const testTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Core Process Variables
  const [batteryV, setBatteryV] = useState(INITIALS.batteryV);
  const [hydraulicPressure, setHydraulicPressure] = useState(0);
  const [fuelM3, setFuelM3] = useState(
    INITIALS.fuelTankCapM3 * INITIALS.fuelLevelPct
  ); // 1.2 m³ initially

  // Engine State
  const [engineState, setEngineState] = useState<EngineState>("stopped");
  const [rpm, setRpm] = useState(0);
  const [voltage, setVoltage] = useState(0);
  const [frequency, setFrequency] = useState(0);
  const [kw, setKw] = useState(0);
  const [amps, setAmps] = useState(0);
  const [loPressure, setLoPressure] = useState(0);
  const [foPressure, setFoPressure] = useState(0);
  const [jcfwPressure, setJcfwPressure] = useState(0);

  // Alarms/Indicators
  const [tripIndication, setTripIndication] = useState(false);
  const [failToStartIndication, setFailToStartIndication] = useState(false);
  const [stabilized, setStabilized] = useState(false);

  // Timers / refs
  const startTimeRef = useRef<number | null>(null);
  const hydraulicAutoACBTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const drainIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stabilizationTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // 🔄 Mode 4: DO44 Drain Logic
  useEffect(() => {
    if (DO44) {
      if (drainIntervalRef.current) return;
      drainIntervalRef.current = setInterval(() => {
        setFuelM3((prev) => {
          const next = Math.max(0, prev - 0.01); // 0.01 m³ every 25s
          return next;
        });
      }, 25000); // 25 seconds interval
    } else {
      if (drainIntervalRef.current) {
        clearInterval(drainIntervalRef.current);
        drainIntervalRef.current = null;
      }
    }
    return () => {
      if (drainIntervalRef.current) {
        clearInterval(drainIntervalRef.current);
        drainIntervalRef.current = null;
      }
    };
  }, [DO44]);
  const handleRunTest = (testCase: number, autoExecute: boolean = true) => {
    if (!autoExecute) return;

    resetAll();
    setIsTestRunning(true);
    setCurrentTest(testCase);

    // Clear any existing test queue
    testActionQueue.current = [];
    testTimeoutRef.current && clearTimeout(testTimeoutRef.current);

    switch (testCase) {
      case 1:
        // Test 1: Auto trip and battery drain
        testActionQueue.current = [
          { action: "setState", delay: 100, data: { DO32: false } },
          { action: "startBattery", delay: 500 },
          { action: "startBattery", delay: 3500 },
          { action: "startBattery", delay: 6500 },
          { action: "startBattery", delay: 9500 },
          { action: "startBattery", delay: 12500 },
          { action: "completeTest", delay: 15000 },
        ];
        break;

      case 2:
        // Test 2: Normal start with ramp and ACB
        testActionQueue.current = [
          { action: "setState", delay: 100, data: { DO32: true } },
          { action: "startBattery", delay: 500 },
          { action: "closeACB", delay: 50000 }, // Close ACB at 50s
          { action: "completeTest", delay: 55000 },
        ];
        break;

      case 3:
        // Test 3: Test Mode OFF failure
        testActionQueue.current = [
          {
            action: "setState",
            delay: 100,
            data: { testMode: false, DO32: false },
          },
          { action: "startBattery", delay: 500 },
          { action: "startBattery", delay: 3500 },
          { action: "startBattery", delay: 6500 },
          { action: "startBattery", delay: 9500 },
          { action: "startBattery", delay: 12500 },
          { action: "completeTest", delay: 15000 },
        ];
        break;

      case 4:
        // Test 4: Fuel drain with auto-stop
        testActionQueue.current = [
          { action: "setState", delay: 100, data: { DO44: true, DO32: true } },
          { action: "startBattery", delay: 1000 },
          { action: "completeTest", delay: 60000 }, // Monitor for 60s
        ];
        break;

      case 5:
        // Test 5: Hydraulic start with auto-ACB - Enhanced with debugging
        testActionQueue.current = [
          {
            action: "setState",
            delay: 100,
            data: { batteryV: 14, DO32: true, hydraulicPressure: 120 },
          },
          { action: "debug", delay: 200, message: "Before hydraulic start" },
          { action: "startHydraulic", delay: 500 },
          {
            action: "debug",
            delay: 1000,
            message: "After hydraulic start - should see 'starting'",
          },
          {
            action: "debug",
            delay: 10000,
            message: "10s mark - ACB should close soon",
          },
          {
            action: "debug",
            delay: 20000,
            message: "20s mark - ACB should close any moment",
          },
          {
            action: "debug",
            delay: 25000,
            message: "25s mark - checking ACB status",
          },
          { action: "forceACBClose", delay: 30000 }, // Fallback: force ACB close if auto didn't work
          { action: "completeTest", delay: 35000 },
        ];
        break;
    }

    executeNextTestAction();
  };

  const executeNextTestAction = () => {
    if (testActionQueue.current.length === 0) {
      completeTest();
      return;
    }

    const nextAction = testActionQueue.current.shift();
    if (!nextAction) return;

    testTimeoutRef.current = setTimeout(() => {
      switch (nextAction.action) {
        case "setState":
          if (nextAction.data) {
            Object.entries(nextAction.data).forEach(([key, value]) => {
              switch (key) {
                case "DO32":
                  setDO32(value as boolean);
                  break;
                case "DO44":
                  setDO44(value as boolean);
                  break;
                case "testMode":
                  setTestMode(value as boolean);
                  break;
                case "batteryV":
                  setBatteryV(value as number);
                  break;
                case "hydraulicPressure":
                  setHydraulicPressure(value as number);
                  break;
              }
            });
          }
          break;

        case "startBattery":
          startOnBattery();
          break;

        case "startHydraulic":
          startHydraulic(); // Call startHydraulic directly instead of operateHY31
          break;

        case "operateHY31":
          operateHY31(); // Keep this if needed elsewhere
          break;

        case "closeACB":
          closeACB();
          break;

        case "forceACBClose":
          console.log("🔄 Force-closing ACB as fallback");
          setAcbClosed(true);
          break;

        case "debug":
          console.log(`🔍 DEBUG [Test ${currentTest}]:`, nextAction.message);
          console.log("- Engine State:", engineState);
          console.log("- ACB Closed:", acbClosed);
          console.log("- Hydraulic Pressure:", hydraulicPressure);
          console.log("- DO32:", DO32);
          console.log("- Voltage:", voltage, "Frequency:", frequency);
          break;

        case "waitForACB":
          console.log("⏳ Waiting for ACB auto-close...");
          break;

        case "completeTest":
          completeTest();
          return;
      }

      executeNextTestAction();
    }, nextAction.delay);
  };

  const completeTest = () => {
    setIsTestRunning(false);
    setCurrentTest(null);
    testActionQueue.current = [];

    // Show completion message
    setTimeout(() => {
      alert(
        `🎉 Test ${currentTest} completed automatically!\n\nCheck the simulator results against expected behavior.`
      );
    }, 500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      testTimeoutRef.current && clearTimeout(testTimeoutRef.current);
    };
  }, []);

  // 🔄 Engine auto-stop when fuel < 0.05 m³
  useEffect(() => {
    if (
      fuelM3 < 0.05 &&
      (engineState === "running" || engineState === "starting")
    ) {
      stopEngine("Fuel level below 0.05 m³ – engine stopped");
      // Once below 0.05 m³, DO33 cannot refill
      if (DO33) {
        setDO33(false);
      }
    }
  }, [fuelM3, engineState]);

  // 🔄 Ramp logic during starting/running
  useEffect(() => {
    let raf: number | null = null;

    const tick = () => {
      if (engineState === "starting" || engineState === "running") {
        const now = performance.now();
        const startT = startTimeRef.current ?? now;
        if (startTimeRef.current == null) startTimeRef.current = now;
        const elapsedSec = (now - startT) / 1000;

        // Voltage/Frequency ramp per table
        const { V, Hz } = interpRamp(elapsedSec);
        setVoltage(V);
        setFrequency(Hz);
        setRpm(~~(Hz * 10)); // Simple RPM calculation

        // Set minimal pressures when running
        if (engineState === "running") {
          setLoPressure(2.5);
          setFoPressure(1.8);
          setJcfwPressure(3.2);
        }

        // Check if stabilized (~45s)
        if (elapsedSec >= 45 && !stabilized) {
          setStabilized(true);
        }

        // Load management
        if (acbClosed && !testMode && engineState === "running") {
          // On-load parameters
          setVoltage(RUNNING_PARAMS.voltage);
          setFrequency(RUNNING_PARAMS.frequency);
          setKw(RUNNING_PARAMS.kw);
          setAmps(RUNNING_PARAMS.amps);
          setRpm(RUNNING_PARAMS.rpm);
        } else {
          // No load or test mode
          setKw(0.5);
          setAmps(1);
        }
      }
      raf = requestAnimationFrame(tick);
    };

    if (engineState === "starting" || engineState === "running") {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [engineState, acbClosed, testMode, stabilized]);

  function resetAlarms() {
    setTripIndication(false);
    setFailToStartIndication(false);
  }

  function drainBatteryForAttempt() {
    setBatteryV((v) => Math.max(0, +(v - 2).toFixed(1)));
  }

  // 🎯 Mode 1 & 2: Battery Start
  function startOnBattery() {
    resetAlarms();

    // Check battery condition
    if (batteryV < 16) {
      setFailToStartIndication(true);
      setEngineState("failed");
      return;
    }

    // Attempt start - always drain battery
    drainBatteryForAttempt();

    if (!DO32) {
      // 🎯 Mode 1: DO32 closed -> trip in 2s
      setEngineState("starting");
      startingTimeout.current && clearTimeout(startingTimeout.current);
      startingTimeout.current = setTimeout(() => {
        setTripIndication(true);
        setEngineState("tripped");
        // Check if battery is too low after this attempt
        if (batteryV - 2 < 15.8) {
          setFailToStartIndication(true);
        }
        stopRotationOnly();
      }, 2000);
      return;
    }

    // 🎯 Mode 2: DO32 open -> normal start
    setEngineState("starting");
    setStabilized(false);
    startTimeRef.current = null;

    // Set stabilization timeout
    stabilizationTimeout.current && clearTimeout(stabilizationTimeout.current);
    stabilizationTimeout.current = setTimeout(() => {
      if (engineState === "starting") {
        setEngineState("running");
      }
    }, 45000);
  }

  // 🎯 Mode 5: Hydraulic Start
  function startHydraulic() {
    resetAlarms();

    if (!DO32) {
      // Cranks but no fuel -> trip in 2s
      setEngineState("starting");
      startingTimeout.current && clearTimeout(startingTimeout.current);
      startingTimeout.current = setTimeout(() => {
        setTripIndication(true);
        setEngineState("tripped");
        stopRotationOnly();
      }, 2000);
      return;
    }

    if (hydraulicPressure < 100) {
      setFailToStartIndication(true);
      setEngineState("failed");
      return;
    }

    // Successful hydraulic start
    setEngineState("starting");
    setStabilized(false);
    startTimeRef.current = null;

    // Auto ACB close within 20–28s for hydraulic path
    if (hydraulicAutoACBTimeout.current)
      clearTimeout(hydraulicAutoACBTimeout.current);
    const delay = (20 + Math.floor(Math.random() * 9)) * 1000; // 20–28s
    hydraulicAutoACBTimeout.current = setTimeout(() => {
      setAcbClosed(true);
    }, delay);

    // Set stabilization
    stabilizationTimeout.current && clearTimeout(stabilizationTimeout.current);
    stabilizationTimeout.current = setTimeout(() => {
      if (engineState === "starting") {
        setEngineState("running");
      }
    }, 45000);
  }

  function stopRotationOnly() {
    setRpm(0);
    setVoltage(0);
    setFrequency(0);
    setKw(0);
    setAmps(0);
    setLoPressure(0);
    setFoPressure(0);
    setJcfwPressure(0);
  }

  function stopEngine(reason?: string) {
    setEngineState("stopped");
    setStabilized(false);
    stopRotationOnly();
    if (reason) {
      setTripIndication(true);
    }
    // Clear timeouts
    startingTimeout.current && clearTimeout(startingTimeout.current);
    stabilizationTimeout.current && clearTimeout(stabilizationTimeout.current);
    hydraulicAutoACBTimeout.current &&
      clearTimeout(hydraulicAutoACBTimeout.current);
  }

  function handlePressStart() {
    if (batteryV >= 16) {
      startOnBattery();
    } else {
      // 🎯 Mode 5: Battery too low, must use hydraulic
      setFailToStartIndication(true);
    }
  }

  function handleTestModeToggle(v: boolean) {
    setTestMode(v);
    // 🎯 Mode 3: If Test Mode OFF and DO32 closed, will trip and drain battery
  }

  function manualPump() {
    setHydraulicPressure((p) => Math.min(200, p + 20));
  }

  function operateHY31() {
    setHY31(true);
    setTimeout(() => setHY31(false), 400); // momentary operation
    startHydraulic();
  }

  function closeACB() {
    setAcbClosed(true);
  }

  function openACB() {
    setAcbClosed(false);
  }

  function toggleDO33(v: boolean) {
    // 🎯 Mode 4: Once tank < 0.05 m³, DO33 cannot refill
    if (fuelM3 < 0.05 && v) {
      setFailToStartIndication(true);
      return;
    }
    setDO33(v);
    if (v) {
      // Refill logic
      const fill = setInterval(() => {
        setFuelM3((prev) => {
          const next = Math.min(INITIALS.fuelTankCapM3, prev + 0.005);
          if (next >= INITIALS.fuelTankCapM3) {
            clearInterval(fill);
          }
          return next;
        });
      }, 1000);

      const stop = () => {
        clearInterval(fill);
        document.removeEventListener("do33-close", stop as any);
      };
      document.addEventListener("do33-close", stop as any);
    } else {
      document.dispatchEvent(new Event("do33-close"));
    }
  }

  function resetAll() {
    // Reset all to initial state
    setDO32(false);
    setDO33(false);
    setDO44(false);
    setHY31(false);
    setTestMode(true);
    setAcbClosed(false);
    setShorePowerConnected(false);

    setBatteryV(24);
    setHydraulicPressure(0);
    setFuelM3(INITIALS.fuelTankCapM3 * INITIALS.fuelLevelPct);

    setEngineState("stopped");
    setTripIndication(false);
    setFailToStartIndication(false);
    setStabilized(false);

    stopRotationOnly();

    // Clear all timeouts
    startingTimeout.current && clearTimeout(startingTimeout.current);
    stabilizationTimeout.current && clearTimeout(stabilizationTimeout.current);
    hydraulicAutoACBTimeout.current &&
      clearTimeout(hydraulicAutoACBTimeout.current);
    if (drainIntervalRef.current) {
      clearInterval(drainIntervalRef.current);
      drainIntervalRef.current = null;
    }
  }

  // UI derived values
  const fuelPct = fuelM3 / INITIALS.fuelTankCapM3;
  const batteryStatus = batteryV < 16 ? "LOW" : batteryV < 18 ? "MED" : "OK";
  const canStartOnBattery = batteryV >= 16;
  const fuelCritical = fuelM3 < 0.05;

  return (
    <div className="w-full min-h-screen p-6 text-white bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            Maritime Engine Room Simulator — MP120 (Dead Ship)
            {isTestRunning && (
              <span className="px-2 py-1 ml-3 text-sm bg-blue-500 rounded">
                TEST MODE ACTIVE
              </span>
            )}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={resetAll}
              disabled={isTestRunning}
              className={`rounded-2xl px-4 py-2 text-sm shadow ${
                isTestRunning
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              Reset All
            </button>
          </div>
        </header>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card title="Status & Alarms">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Engine State</span>
                <span
                  className={`rounded-xl px-3 py-1 text-sm capitalize ${
                    engineState === "running"
                      ? "bg-emerald-900 text-emerald-200"
                      : engineState === "tripped"
                      ? "bg-rose-900 text-rose-200"
                      : engineState === "failed"
                      ? "bg-amber-900 text-amber-200"
                      : "bg-slate-800 text-gray-300"
                  }`}
                >
                  {engineState}
                  {stabilized && engineState === "running" && " ✓"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Battery</span>
                <span className="px-3 py-1 text-sm rounded-xl bg-slate-800">
                  {fmt.num(batteryV, 1)} V
                  <span
                    className={`ml-2 text-xs ${
                      batteryStatus === "OK"
                        ? "text-emerald-400"
                        : batteryStatus === "MED"
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    [{batteryStatus}]
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  Hydraulic Pressure
                </span>
                <span className="px-3 py-1 text-sm rounded-xl bg-slate-800">
                  {fmt.num(hydraulicPressure, 0)} psi
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Fuel Level</span>
                <span
                  className={`rounded-xl px-3 py-1 text-sm ${
                    fuelCritical
                      ? "bg-rose-900 text-rose-200"
                      : "bg-slate-800 text-gray-300"
                  }`}
                >
                  {fmt.num(fuelM3, 3)} m³ ({fmt.pct(fuelPct, 0)})
                  {fuelCritical && " ⚠️"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Lamp on={tripIndication} label="Trip" color="bg-rose-500" />
                <Lamp
                  on={failToStartIndication}
                  label="Fail to Start"
                  color="bg-amber-400"
                />
                <Lamp on={testMode} label="Test Mode" color="bg-cyan-400" />
                <Lamp
                  on={acbClosed}
                  label="ACB Closed"
                  color="bg-emerald-400"
                />
                <Lamp on={stabilized} label="Stabilized" color="bg-green-500" />
                <Lamp
                  on={!canStartOnBattery}
                  label="Low Battery"
                  color="bg-rose-400"
                />
              </div>
            </div>
          </Card>

          <Card title="Generator Readings">
            <div className="grid grid-cols-2 gap-3">
              <Gauge label="RPM" value={rpm} unit="rpm" max={1200} />
              <Gauge label="Voltage" value={voltage} unit="V" max={480} />
              <Gauge label="Frequency" value={frequency} unit="Hz" max={65} />
              <Gauge label="Power" value={kw} unit="kW" max={8} />
              <Gauge label="Current" value={amps} unit="A" max={20} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div className="text-center">
                <div className="text-gray-400">L.O. Pressure</div>
                <div className="font-mono">{fmt.num(loPressure, 1)} bar</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">F.O. Pressure</div>
                <div className="font-mono">{fmt.num(foPressure, 1)} bar</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">J.C.F.W. Pressure</div>
                <div className="font-mono">{fmt.num(jcfwPressure, 1)} bar</div>
              </div>
            </div>
          </Card>

          <Card title="Initial Conditions">
            <ul className="space-y-1 text-sm text-gray-300">
              <li>J.C.F.W. Temp: {INITIALS.jcfwTempC}°C</li>
              <li>Exhaust Gas Temp: {INITIALS.exhGasTempC}°C</li>
              <li>
                L.O. Sump: {fmt.pct(INITIALS.loSumpAvail)} of{" "}
                {INITIALS.loSumpCapM3} m³
              </li>
              <li>
                Hydraulic Reservoir:{" "}
                {INITIALS.hydraulicReservoirFull ? "Full" : "Empty"}
              </li>
              <li>
                Shore Power:{" "}
                {shorePowerConnected ? "Connected" : "Disconnected"}
              </li>
              <li className="mt-2">
                Test Mode:{" "}
                <span
                  className={`${testMode ? "text-cyan-300" : "text-gray-300"}`}
                >
                  {testMode ? "ON" : "OFF"}
                </span>
              </li>
            </ul>
          </Card>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card title="Start/Stop & ACB">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handlePressStart}
                disabled={!canStartOnBattery}
                className={`rounded-2xl px-4 py-2 text-sm font-medium shadow ${
                  canStartOnBattery
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-gray-600 cursor-not-allowed opacity-50"
                }`}
              >
                Start (Battery)
              </button>
              <button
                onClick={() => stopEngine()}
                className="px-4 py-2 text-sm font-medium shadow rounded-2xl bg-rose-600 hover:bg-rose-500"
              >
                Stop
              </button>
              <button
                onClick={closeACB}
                className="px-4 py-2 text-sm shadow rounded-2xl bg-sky-700 hover:bg-sky-600"
              >
                ACB Close
              </button>
              <button
                onClick={openACB}
                className="px-4 py-2 text-sm shadow rounded-2xl bg-slate-700 hover:bg-slate-600"
              >
                ACB Open
              </button>
            </div>
            <div className="mt-4">
              <Toggle
                label="Test Mode"
                checked={testMode}
                onChange={handleTestModeToggle}
              />
            </div>
            <p className="mt-3 text-xs text-gray-400">
              {testMode
                ? "Test Mode ON: Engine won't pick up load until ACB is closed manually."
                : "Test Mode OFF: ACB will close automatically when parameters stabilize."}
            </p>
          </Card>

          <Card title="Fuel & Valves">
            <Toggle
              label="DO32 – Fuel Valve (to engine)"
              checked={DO32}
              onChange={setDO32}
            />
            <Toggle
              label="DO33 – Fill Valve (to E-Gen DO Tank)"
              checked={DO33}
              onChange={toggleDO33}
              disabled={fuelCritical}
            />
            <Toggle
              label="DO44 – Drain to Storage"
              checked={DO44}
              onChange={setDO44}
            />
            <div className="mt-3 text-xs text-amber-300">
              {fuelCritical
                ? "⚠️ Fuel level critical! DO33 cannot refill below 0.05 m³."
                : "Opening DO44 drains 0.01 m³ every 25s. Engine stops when < 0.05 m³."}
            </div>
          </Card>

          <Card title="Hydraulic Start">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Manual Hand Pump</span>
              <button
                onClick={manualPump}
                className="px-4 py-2 text-sm shadow rounded-2xl bg-slate-800 hover:bg-slate-700"
              >
                Pump +20 psi
              </button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm text-gray-300">Operate HY31</span>
              <button
                onClick={operateHY31}
                className="px-4 py-2 text-sm bg-indigo-700 shadow rounded-2xl hover:bg-indigo-600"
              >
                HY31 (Momentary)
              </button>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Hydraulic start requires DO32 open and ≥100 psi pressure. ACB
              auto-closes 20–28s after hydraulic start.
            </p>
          </Card>
        </div>

        {/* Scenario Guide */}
        <Card title="🎯 Interactive Scenarios (Try These)">
          <ol className="pl-6 space-y-3 text-sm text-gray-200 list-decimal">
            <li>
              <b>Mode 1:</b> Press <b>Start</b> with DO32 <i>closed</i> → Engine
              trips in ~2s; battery drains ~2V per attempt; repeat until Fail to
              Start (&lt; 15.8V).
            </li>
            <li>
              <b>Mode 2:</b> Open <b>DO32</b> then <b>Start</b> → Observe V/Hz
              ramp (stabilizes ~45s); Test Mode ON → no load until ACB Close.
            </li>
            <li>
              <b>Mode 3:</b> Switch <b>Test Mode OFF</b> then try starting with
              DO32 closed → repeated trips consume battery; Fail to Start once
              battery &lt; 15.8V.
            </li>
            <li>
              <b>Mode 4:</b> Open <b>DO44</b> → Fuel drains 0.01 m³/25s; when
              &lt; 0.05 m³ engine stops. DO33 cannot refill below 0.05 m³.
            </li>
            <li>
              <b>Mode 5:</b> No battery? Pump hydraulics to ≥100 psi, open{" "}
              <b>DO32</b>, operate <b>HY31</b> → engine starts; ACB auto-closes
              in ~20–28s.
            </li>
          </ol>
        </Card>
        {/* <TestRunner onRunTest={handleRunTest} isTestRunning={isTestRunning} /> */}

        <footer className="pt-2 text-xs text-center text-gray-500">
          © Maritime Engine Room Simulator — MP120 (Dead Ship Scenario) • For
          training use only
        </footer>
      </div>
    </div>
  );
}
