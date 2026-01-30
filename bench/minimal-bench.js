import { createCache } from "../dist/node/index.mjs";
import { deleteKey } from "../dist/node/index.mjs";
import { get } from "../dist/node/index.mjs";
import { setOrUpdate } from "../dist/node/index.mjs";

// Función para formatear números con separadores
const formatNumber = num => {
  return new Intl.NumberFormat("es-ES").format(num);
};

// Función para formatear tiempo
const formatTime = ms => {
  if (ms < 1000) {
    return `${formatNumber(ms)} ms`;
  } else {
    const seconds = (ms / 1000).toFixed(2);
    return `${formatNumber(parseFloat(seconds))} s`;
  }
};

// Función para log de progreso con formato amigable
const logProgress = (message, emoji) => {
  console.log(emoji ? `${emoji} ${message}` : message);
  console.log(""); // Espacio para mejor legibilidad
};

// Función para log de resultados
const logResult = (label, value, emoji = "✅") => {
  console.log(`${emoji} ${label}: ${value}`);
};

// Función para medir tiempo
const measureTime = (label, fn) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  const timeStr = formatTime(end - start);
  logResult(label, timeStr, "⏱️");
};

// Pruebas de carga pesada
const runHeavyLoadTests = async () => {
  logProgress("Iniciando pruebas de carga pesada...", "🚀");

  const scenarios = [
    {
      name: "TTL corto sin stale",
      options: {
        defaultTtl: 1000,
        defaultStaleTtl: 0,
        purgeStaleOnGet: false,
        purgeStaleOnSweep: false,
      },
      numKeys: 1000000,
    },
    {
      name: "TTL largo con stale, purge on get",
      options: {
        defaultTtl: 5000,
        defaultStaleTtl: 10000,
        purgeStaleOnGet: true,
        purgeStaleOnSweep: false,
      },
      numKeys: 500000,
    },
    {
      name: "TTL largo con stale, purge on sweep",
      options: {
        defaultTtl: 5000,
        defaultStaleTtl: 8000,
        purgeStaleOnGet: false,
        purgeStaleOnSweep: true,
      },
      numKeys: 500000,
    },
    {
      name: "Carga extrema: 10M entradas",
      options: {
        defaultTtl: 15000,
        defaultStaleTtl: 20000,
        purgeStaleOnGet: false,
        purgeStaleOnSweep: false,
      },
      numKeys: 10000000,
    },
  ];

  for (const [index, scenario] of scenarios.entries()) {
    logProgress(`Ejecutando escenario ${index + 1}/${scenarios.length}: ${scenario.name}`, "🔄");
    logResult(
      "Configuración",
      `TTL: ${formatNumber(scenario.options.defaultTtl)} ms, StaleTTL: ${formatNumber(scenario.options.defaultStaleTtl)} ms`,
      "⚙️",
    );

    const cache = createCache(scenario.options);

    // Set: Insertar entradas
    logProgress(`Insertando ${formatNumber(scenario.numKeys)} entradas...`, "➕");
    measureTime(`Set ${formatNumber(scenario.numKeys)} entradas`, () => {
      for (let i = 0; i < scenario.numKeys; i++) {
        setOrUpdate(cache, { key: `key-${scenario.name}-${i}`, value: `value-${i}` });
      }
    });
    logResult("Tamaño del cache después de set", formatNumber(cache.store.size), "📊");

    // Get: Recuperar entradas
    logProgress(`Recuperando ${formatNumber(scenario.numKeys)} entradas...`, "🔍");
    measureTime(`Get ${formatNumber(scenario.numKeys)} entradas`, () => {
      for (let i = 0; i < scenario.numKeys; i++) {
        get(cache, `key-${scenario.name}-${i}`);
      }
    });
    logResult("Tamaño del cache después de get", formatNumber(cache.store.size), "📊");

    // Delete: Eliminar algunas entradas
    const deleteCount = Math.min(100000, scenario.numKeys);
    logProgress(`Eliminando ${formatNumber(deleteCount)} entradas...`, "🗑️");
    measureTime(`Delete ${formatNumber(deleteCount)} entradas`, () => {
      for (let i = 0; i < deleteCount; i++) {
        deleteKey(cache, `key-${scenario.name}-${i}`);
      }
    });
    logResult("Tamaño del cache después de delete", formatNumber(cache.store.size), "📊");

    // Esperar tiempo suficiente para expiraciones y monitorear sweeper
    const waitTime = scenario.options.defaultStaleTtl
      ? scenario.options.defaultStaleTtl * 1.5
      : scenario.options.defaultTtl
        ? scenario.options.defaultTtl * 1.5
        : 2000;

    logProgress(
      `Esperando ${formatTime(waitTime)} para expiración y monitoreando sweeper...`,
      "⏳",
    );
    const startWait = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startWait;
      if (elapsed >= waitTime) {
        clearInterval(interval);
        return;
      }
      logResult(`Tamaño del cache en ${formatTime(elapsed)}`, formatNumber(cache.store.size), "📈");
    }, 1000); // Log cada 1 segundo

    await new Promise(resolve => setTimeout(resolve, waitTime));
    clearInterval(interval);
    logResult("Tamaño del cache después de espera", formatNumber(cache.store.size), "📊");

    // Sweep manual (simular)
    logProgress("Simulando sweep adicional...", "🧹");
    measureTime("Get después de expiración", () => {
      for (let i = deleteCount; i < Math.min(deleteCount + 10000, scenario.numKeys); i++) {
        get(cache, `key-${scenario.name}-${i}`);
      }
    });
    logResult("Tamaño del cache después de sweep simulado", formatNumber(cache.store.size), "📊");

    logResult(
      `Escenario ${scenario.name} completado`,
      `Tamaño final del cache: ${formatNumber(cache.store.size)}`,
      "🎉",
    );
    console.log("─".repeat(60)); // Separador visual
  }

  logProgress("Todas las pruebas completadas.", "🎊");
};

// Ejecutar pruebas
runHeavyLoadTests();
