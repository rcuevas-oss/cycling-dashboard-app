import { calculatePMC, getLocalYYYYMMDD } from './metricsUtils.js';
import assert from 'node:assert';

// Función helper para generar X días de carga falsa continua desde una fecha inicial
function generateMockHistoryStrict(daysSpan: number, todayOffset: number = 0, addRestDays: boolean = false): Record<string, number> {
    const dailyLoads: Record<string, number> = {};
    const today = new Date();
    today.setDate(today.getDate() - todayOffset); // Mover el "hoy" hacia atrás si quisieramos

    // Generamos datos para {daysSpan} días
    for (let i = daysSpan - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = getLocalYYYYMMDD(d);

        if (addRestDays && i % 3 === 0) {
            // Día de descanso
            dailyLoads[dateStr] = 0;
        } else {
            // Un par de días con sesión doble
            if (i % 7 === 0) {
                dailyLoads[dateStr] = 150; // Sesión doble
            } else {
                dailyLoads[dateStr] = 70;
            }
        }
    }
    return dailyLoads;
}

async function runTests() {
    console.log("Testing STRICT Data Maturity & PMC Math Logic...\n");

    try {
        // Test 1: 10 días exactos -> Insufficient
        const data10 = generateMockHistoryStrict(10);
        const res10 = calculatePMC(data10);
        assert.strictEqual(res10.status, 'insufficient', `Debería ser insufficient. Recibido: ${res10.status}`);
        assert.strictEqual(res10.daysAvailable, 10, `Debería contar 10 días disponibles. Recibido: ${res10.daysAvailable}`);
        assert.ok(res10.readinessScore < 0.5, "Readiness score debería ser bajo.");
        assert.strictEqual(res10.results.length, 10, "Array de resultados debe tener exactamente la longitud de iteración = 10.");

        // Assert semilla de día 1
        assert.strictEqual(res10.results[0].ctlRaw, res10.results[0].tss, "CTL Raw del día 1 debe igualar TSS");
        assert.strictEqual(res10.results[0].tsbRaw, 0, "TSB del día 1 debe ser 0");

        console.log('✅ Test 1 Pasado: Atleta de 10 días es INSUFFICIENT y cumple seeds');

        // Test 2: 20 días con descansos -> Provisional
        const data20 = generateMockHistoryStrict(20, 0, true);
        const res20 = calculatePMC(data20);
        assert.strictEqual(res20.status, 'provisional', `Debería ser provisional. Recibido: ${res20.status}`);
        assert.strictEqual(res20.daysAvailable, 20, `Debería contar 20 días disponibles. Recibido: ${res20.daysAvailable}`);

        // Revisamos el último elemento
        const last20 = res20.results[res20.results.length - 1];
        assert.ok(last20.ctlDisplayed !== undefined, "Debe exportar campos de auditoría");
        assert.strictEqual(last20.ctlDisplayed, Math.round(last20.ctlRaw), "ctlDisplayed === round(ctlRaw)");

        console.log('✅ Test 2 Pasado: Atleta de 20 días es PROVISIONAL (con descansos y sessions dobles)');

        // Test 3: 42 días, último dato fue hace 7 días (todayOffset = 7)
        // La serie NO debe rellenarse artificialmente hasta el hoy real.
        const data42_old = generateMockHistoryStrict(42, 7, false);
        const res42_old = calculatePMC(data42_old);
        assert.strictEqual(res42_old.status, 'calibrated', `Debería ser calibrated. Recibido: ${res42_old.status}`);
        assert.strictEqual(res42_old.daysAvailable, 42, `Debería contar 42 días disponibles de rampa aislada. Recibido: ${res42_old.daysAvailable}`);
        assert.strictEqual(res42_old.results.length, 42, "No debe padear más allá del último día disponible (length debe ser 42)");

        console.log('✅ Test 3 Pasado: Atleta de 42 días desconectado hace 1 semana no distorsiona métricas');

        console.log("\n🎉 ALL TESTS PASSED!");
    } catch (err: any) {
        console.error("❌ Test falló:");
        console.error(err.message);
        process.exit(1);
    }
}

runTests();
