function renderizarInventario() {
    const contenedor = document.getElementById('contenedorInventario');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    const materiales = [...new Set(inventario.map(j => j.material || 'Sin Clasificar'))];

    materiales.forEach(mat => {
        contenedor.innerHTML += `
            <div class="col-12 mt-4 mb-2">
                <h4 class="text-uppercase fw-bold border-bottom pb-2" style="color: #014421;">
                    ✨ ${mat}
                </h4>
            </div>`;

        const joyasFiltradas = inventario.filter(j => {
            const coincideMaterial = (j.material || 'Sin Clasificar') === mat;
            if (esCliente) return coincideMaterial && (parseInt(j.stock) > 0);
            return coincideMaterial;
        });

        joyasFiltradas.forEach(joya => {
            const costoNum = parseNumber(joya.costo);
            const precioNum = parseNumber(joya.precio);
            const urlImg = joya.imagen || 'https://via.placeholder.com/400?text=Joyas';
            const nombreEscapado = joya.nombre.replace(/'/g, "\\'");

            const htmlCosto = mostrarCostos ? `
                <div class="bg-light rounded p-1 mb-2">
                    <p class="text-danger small mb-0">C: $${costoNum.toLocaleString()}</p>
                    <p class="text-primary small mb-0">G: $${(precioNum - costoNum).toLocaleString()}</p>
                </div>` : '';

            contenedor.innerHTML += `
                <div class="col-6 col-md-3 mb-4">
                    <div class="card card-joya shadow-sm h-100 position-relative">
                        <img src="${urlImg}" class="img-cuadrada">
                        <div class="card-body text-center p-2">
                            <h6 class="mb-1 text-truncate">${joya.nombre}</h6>
                            <small class="text-muted d-block mb-1">${joya.categoria}</small>
                            ${htmlCosto}
                            <p class="text-muted mb-1 fw-bold">$${precioNum.toLocaleString()}</p>
                            <div class="d-flex align-items-center justify-content-center gap-1 flex-wrap">
                                ${!esCliente ? `
                                    <p class="small mb-0 w-100 ${joya.stock < 5 ? 'text-danger' : 'text-success'}">Stock: ${joya.stock}</p>
                                    <button class="btn btn-sm btn-outline-warning py-0 px-2" onclick="prepararEdicion(${joya.id})">✏️</button>
                                    <button class="btn btn-sm btn-outline-primary py-0 px-2 fw-bold" onclick="sumarStock(${joya.id}, '${nombreEscapado}', this)">+</button>
                                    <button class="btn btn-sm btn-outline-danger py-0 px-2 fw-bold" onclick="eliminarProducto(${joya.id}, '${nombreEscapado}', this)">&times;</button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>`;
        });
    });
}

function prepararEdicion(id) {
    const joya = inventario.find(j => j.id == id);
    if (!joya) return;

    document.getElementById('nombreJoya').value = joya.nombre;
    document.getElementById('categoriaJoya').value = joya.categoria;
    document.getElementById('materialJoya').value = joya.material;
    document.getElementById('costoJoya').value = joya.costo;
    document.getElementById('precioJoya').value = joya.precio;
    document.getElementById('stockJoya').value = joya.stock;

    editandoId = id;
    const btn = document.getElementById('btnGuardar');
    btn.innerText = 'Actualizar';
    btn.classList.replace('btn-pino', 'btn-warning');
    btn.onclick = () => ejecutarEdicion(btn);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function ejecutarEdicion(btn) {
    const nombre = document.getElementById('nombreJoya').value;
    const costo = parseInt(document.getElementById('costoJoya').value);
    const precio = parseInt(document.getElementById('precioJoya').value);
    const stock = parseInt(document.getElementById('stockJoya').value);
    const nombreArchivo = document.getElementById('imagenJoya').value;

    if (!nombre || isNaN(costo) || isNaN(precio) || isNaN(stock)) {
        mostrarToast('Faltan datos para actualizar el producto.', 'warning');
        return;
    }
    if (btn) bloquearBoton(btn, 'Actualizando...');

    const editado = {
        tipo: 'EDITAR_PRODUCTO',
        token: TOKEN,
        id: editandoId,
        nombre: nombre,
        categoria: document.getElementById('categoriaJoya').value,
        material: document.getElementById('materialJoya').value,
        costo: costo,
        precio: precio,
        stock: stock,
        imagen: nombreArchivo ? 'img/' + nombreArchivo : ''
    };

    document.body.style.cursor = 'wait';
    try {
        await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(editado) });
        mostrarToast('Producto actualizado.', 'success');
        location.reload();
    } catch (error) {
        mostrarToast('Error al actualizar el producto.', 'danger');
        if (btn) desbloquearBoton(btn);
    } finally {
        document.body.style.cursor = 'default';
    }
}

function alternarCostos() {
    mostrarCostos = !mostrarCostos;
    const btnVisibilidad = document.getElementById('btnVisibilidad');
    if (btnVisibilidad) {
        btnVisibilidad.innerText = mostrarCostos ? '🙈 Ocultar Costos' : '👁️ Ver Costos';
    }
    renderizarInventario();
}

async function agregarProducto(btn) {
    const nombre = document.getElementById('nombreJoya').value;
    const categoria = document.getElementById('categoriaJoya').value;
    const material = document.getElementById('materialJoya').value;
    const nombreImagen = document.getElementById('imagenJoya').value;
    const costo = parseInt(document.getElementById('costoJoya').value);
    const precio = parseInt(document.getElementById('precioJoya').value);
    const stock = parseInt(document.getElementById('stockJoya').value);

    if (!nombre || !categoria || !material || isNaN(costo) || isNaN(precio) || isNaN(stock)) {
        mostrarToast('Faltan datos.', 'warning');
        return;
    }
    if (btn) bloquearBoton(btn, 'Guardando...');

    const imagenData = nombreImagen ? 'img/' + nombreImagen : 'https://via.placeholder.com/400?text=Joyas';
    const nuevo = {
        tipo: 'NUEVO_PRODUCTO',
        token: TOKEN,
        id: Date.now(),
        nombre, categoria, material, costo, precio, stock,
        imagen: imagenData
    };

    document.body.style.cursor = 'wait';
    try {
        await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(nuevo) });
        mostrarToast('Producto guardado con éxito.', 'success');
        location.reload();
    } catch (error) {
        mostrarToast('Error al guardar el producto.', 'danger');
        if (btn) desbloquearBoton(btn);
    } finally {
        document.body.style.cursor = 'default';
    }
}

async function sumarStock(id, nombre, btn) {
    if (btn) bloquearBoton(btn, 'Abriendo...');

    const cantidad = await mostrarEntrada({
        title: 'Agregar Stock',
        body: `¿Cuántas unidades de "${nombre}" quieres agregar?`,
        inputLabel: 'Cantidad',
        confirmText: 'Agregar'
    });

    if (btn) desbloquearBoton(btn);
    if (!cantidad) return;

    const data = {
        tipo: 'SUMAR_STOCK',
        token: TOKEN,
        id: id,
        cantidad: cantidad
    };

    document.body.style.cursor = 'wait';
    try {
        if (btn) bloquearBoton(btn, 'Guardando...');
        await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
        mostrarToast('Stock actualizado con éxito.', 'success');
        location.reload();
    } catch (error) {
        mostrarToast('Error al actualizar el stock.', 'danger');
        if (btn) desbloquearBoton(btn);
    } finally {
        document.body.style.cursor = 'default';
    }
}

async function eliminarProducto(id, nombre, btn) {
    const confirmado = await mostrarModal({
        title: 'Eliminar producto',
        body: `¿Eliminar "${nombre}"?`,
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar'
    });
    if (!confirmado) return;
    if (btn) bloquearBoton(btn, 'Eliminando...');

    const data = {
        tipo: 'ELIMINAR_PRODUCTO',
        token: TOKEN,
        id: id
    };

    document.body.style.cursor = 'wait';
    try {
        await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
        mostrarToast('Producto eliminado.', 'success');
        location.reload();
    } catch (error) {
        mostrarToast('Error al eliminar el producto.', 'danger');
        if (btn) desbloquearBoton(btn);
    } finally {
        document.body.style.cursor = 'default';
    }
}
