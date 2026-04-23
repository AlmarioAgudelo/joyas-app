function cargarSelectProductos() {
    const select = document.getElementById('seleccionarProducto');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Elegir producto...</option>';
    inventario.forEach(p => {
        if (p.stock > 0) select.innerHTML += `<option value="${p.id}">${p.nombre} ($${parseNumber(p.precio).toLocaleString()})</option>`;
    });
}

function agregarAlCarrito(btn) {
    const id = parseInt(document.getElementById('seleccionarProducto').value);
    const cant = parseInt(document.getElementById('ventaCantidad').value);

    const p = inventario.find(i => i.id == id);
    if (!p || isNaN(cant) || cant <= 0) {
        mostrarToast('Selecciona un producto y cantidad válida.', 'warning');
        return;
    }
    if (cant > p.stock) {
        mostrarToast('No hay suficiente stock.', 'warning');
        return;
    }

    if (btn) bloquearBoton(btn, 'Agregando...');
    carrito.push({ ...p, cantidad: cant, precioFinal: p.precio });
    renderizarCarrito();
    if (btn) desbloquearBoton(btn);
}

function renderizarCarrito() {
    const lista = document.getElementById('listaCarrito');
    const inputPrecioFinal = document.getElementById('precioFinalAjustado');
    if (!lista) return;

    let subtotalReal = 0;
    lista.innerHTML = '';

    carrito.forEach((item, index) => {
        const sub = item.precioFinal * item.cantidad;
        subtotalReal += sub;
        lista.innerHTML += `<tr><td>${item.nombre}</td><td>x${item.cantidad}</td><td>$${sub.toLocaleString()}</td><td><button class="btn btn-sm text-danger" onclick="eliminarItem(${index})">x</button></td></tr>`;
    });

    const precioManual = parseInt(inputPrecioFinal.value);
    const totalAMostrar = (!isNaN(precioManual) && precioManual > 0) ? precioManual : subtotalReal;
    document.getElementById('totalVentaDisplay').innerText = `Total: $${totalAMostrar.toLocaleString()}`;
}

function eliminarItem(index) {
    carrito.splice(index, 1);
    renderizarCarrito();
}

async function finalizarVenta(btn) {
    if (carrito.length === 0) {
        mostrarToast('Agrega al menos un producto al carrito.', 'warning');
        return;
    }
    if (btn) bloquearBoton(btn, 'Cerrando...');

    const subtotalVenta = carrito.reduce((s, i) => s + (i.precioFinal * i.cantidad), 0);
    const precioManual = parseInt(document.getElementById('precioFinalAjustado').value);
    const totalFinal = (!isNaN(precioManual) && precioManual > 0) ? precioManual : subtotalVenta;
    const costoTotalVenta = carrito.reduce((s, i) => s + (i.costo * i.cantidad), 0);

    const datosVenta = {
        tipo: 'VENTA',
        token: TOKEN,
        fecha: new Date().toISOString(),
        cliente: document.getElementById('clienteNombre').value || 'General',
        telefono: document.getElementById('clienteTel').value || '---',
        productos: carrito.map(p => `${p.nombre} (x${p.cantidad})`).join(', '),
        total: totalFinal,
        costo: costoTotalVenta,
        costoTotal: costoTotalVenta,
        detalles: carrito.map(p => ({ id: p.id, cantidad: p.cantidad }))
    };

    document.body.style.cursor = 'wait';
    try {
        await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(datosVenta) });
        mostrarToast(`Venta cerrada por $${totalFinal.toLocaleString()}`, 'success');
        location.reload();
    } catch (error) {
        mostrarToast('Error al cerrar la venta.', 'danger');
        if (btn) desbloquearBoton(btn);
    } finally {
        document.body.style.cursor = 'default';
    }
}
