async function agregarGasto(btn) {
    const desc = document.getElementById('gastoDesc').value;
    const monto = parseInt(document.getElementById('gastoMonto').value);

    if (!desc || isNaN(monto)) {
        mostrarToast('Pon una descripción y el monto del gasto.', 'warning');
        return;
    }
    if (btn) bloquearBoton(btn, 'Guardando...');

    const nuevoGasto = {
        tipo: 'NUEVO_GASTO',
        token: TOKEN,
        fecha: new Date().toLocaleString(),
        descripcion: desc,
        monto: monto
    };

    document.body.style.cursor = 'wait';
    try {
        await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(nuevoGasto) });
        mostrarToast('Gasto registrado correctamente.', 'success');
        location.reload();
    } catch (error) {
        mostrarToast('Error al registrar el gasto.', 'danger');
        if (btn) desbloquearBoton(btn);
    } finally {
        document.body.style.cursor = 'default';
    }
}

function renderizarGastos() {
    const lista = document.getElementById('listaGastos');
    if (!lista) return;
    lista.innerHTML = '';

    [...gastos].reverse().forEach(g => {
        lista.innerHTML += `
            <tr>
                <td style="font-size:0.75rem">${g.fecha.split(',')[0]}</td>
                <td>${g.descripcion}</td>
                <td class="text-end text-danger">-$${parseInt(g.monto).toLocaleString()}</td>
            </tr>`;
    });

    let totalVentas = 0;
    ventasRealizadas.forEach(v => {
        totalVentas += parseNumber(v.total);
    });
    let sumaGastos = 0;
    gastos.forEach(g => {
        sumaGastos += parseNumber(g.monto);
    });
    const totalDinero = totalVentas - sumaGastos;

    lista.innerHTML += `
        <tr class="table-info">
            <td colspan="2" class="fw-bold">Total Dinero Disponible</td>
            <td class="text-end fw-bold text-success">$${Math.round(totalDinero).toLocaleString()}</td>
        </tr>`;
}

function calcularBalance() {
    let invInversion = 0;
    let totalVentasBrutas = 0;
    let totalCostosVendido = 0;
    let sumaGastos = 0;

    inventario.forEach(p => {
        invInversion += parseNumber(p.costo) * parseNumber(p.stock);
    });

    ventasRealizadas.forEach(v => {
        totalVentasBrutas += parseNumber(v.total);
        totalCostosVendido += parseNumber(v.costo);
    });

    gastos.forEach(g => {
        sumaGastos += parseNumber(g.monto);
    });

    const gananciaReal = totalVentasBrutas - totalCostosVendido - sumaGastos;

    if (document.getElementById('balInversion')) document.getElementById('balInversion').innerText = `$${Math.round(invInversion).toLocaleString()}`;
    if (document.getElementById('balVentas')) document.getElementById('balVentas').innerText = `$${Math.round(totalVentasBrutas).toLocaleString()}`;
    if (document.getElementById('balCostoVentas')) document.getElementById('balCostoVentas').innerText = `$${Math.round(totalCostosVendido).toLocaleString()}`;
    if (document.getElementById('balGanancia')) document.getElementById('balGanancia').innerText = `$${Math.round(gananciaReal).toLocaleString()}`;

    const elGanancia = document.getElementById('balGanancia');
    if (elGanancia) {
        elGanancia.parentElement.className = gananciaReal < 0 ?
            'card p-4 bg-danger text-white text-center' :
            'card p-4 bg-primary text-white text-center';
    }
}
