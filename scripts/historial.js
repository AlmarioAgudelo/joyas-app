function formatearFechaHistorial(fechaRaw) {
    const fecha = String(fechaRaw || '').trim();
    if (!fecha) return '';

    if (fecha.includes('T')) {
        const partes = fecha.split('T');
        const dia = partes[0] || '';
        let hora = partes[1] ? partes[1].replace(/\.\d+.*$/, '') : '';
        hora = hora.slice(0, 5);
        return `${dia} / ${hora}`;
    }

    if (fecha.includes(',')) {
        const partes = fecha.split(',');
        const dia = partes[0] || '';
        const hora = partes[1] ? partes[1].trim().slice(0, 5) : '';
        return hora ? `${dia} / ${hora}` : dia;
    }

    return fecha;
}

function renderizarHistorial() {
    const lista = document.getElementById('listaHistorial');
    if (!lista) return;
    lista.innerHTML = '';

    [...ventasRealizadas].reverse().forEach(v => {
        const fechaHtml = formatearFechaHistorial(v.fecha);

        lista.innerHTML += `
            <tr>
                <td style="font-size: 0.8rem; line-height: 1.2;">${fechaHtml}</td>
                <td>
                    <div class="fw-bold">${v.cliente}</div>
                    <div class="text-muted small">${v.telefono || ''}</div>
                </td>
                <td class="small">${v.productos.split(',').map(p => `<div>${p.trim()}</div>`).join('')}</td>
                <td class="text-end fw-bold">$${parseInt(v.total).toLocaleString()}</td>
            </tr>`;
    });
}
