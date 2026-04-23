const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzFKHlBlxsV1xoesUoDI0pYbvrhLZh4XHyGrxR-Czp0R4T6ktphaHTqXQARzVQhLPylLg/exec"; // REEMPLAZA CON TU URL
const TOKEN = "ALPEZ_2026_SEGURIDAD_99"; // ESTE TOKEN DEBE SER IGUAL AL QUE PUSISTE EN EL GOOGLE SCRIPT

const urlParams = new URLSearchParams(window.location.search);
const esCliente = urlParams.get('vista') === 'cliente';
let mostrarCostos = false;
let inventario = [];
let carrito = [];
let ventasRealizadas = [];
let editandoId = null;
let gastos = [];
let vistaActual = 'inventario';

function parseNumber(value) {
    if (value == null || value === '') return 0;
    if (typeof value === 'number') return value;
    const normalized = String(value).trim().replace(/\./g, '').replace(/,/g, '.');
    return parseFloat(normalized) || 0;
}

function mostrarToast(mensaje, tipo = 'success', duracion = 3500) {
    const contenedor = document.getElementById('toast-container');
    if (!contenedor) return;

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-bg-${tipo} border-0 mb-2`;
    toastEl.role = 'alert';
    toastEl.ariaLive = 'assertive';
    toastEl.ariaAtomic = 'true';
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${mensaje}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button>
        </div>`;

    contenedor.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: duracion });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

function bloquearBoton(btn, texto) {
    if (!btn) return;
    if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add('disabled');
    btn.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${texto || btn.dataset.originalHtml}`;
}

function desbloquearBoton(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.classList.remove('disabled');
    if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
}

function mostrarModal({ title = 'Aviso', body = '', confirmText = 'Sí', cancelText = 'Cancelar' }) {
    const modalEl = document.getElementById('appModal');
    const titulo = document.getElementById('appModalLabel');
    const contenido = document.getElementById('appModalBody');
    const footer = document.getElementById('appModalFooter');
    const modal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });

    titulo.innerText = title;
    contenido.innerHTML = body;
    footer.innerHTML = `
        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">${cancelText}</button>
        <button type="button" class="btn btn-primary btn-sm" id="appModalConfirmBtn">${confirmText}</button>`;

    return new Promise(resolve => {
        let confirmed = false;
        const confirmBtn = document.getElementById('appModalConfirmBtn');

        const cerrar = () => {
            confirmBtn.removeEventListener('click', onConfirm);
            modalEl.removeEventListener('hidden.bs.modal', onHidden);
        };

        const onConfirm = () => {
            confirmed = true;
            cerrar();
            modal.hide();
            resolve(true);
        };

        const onHidden = () => {
            cerrar();
            resolve(confirmed);
        };

        confirmBtn.addEventListener('click', onConfirm);
        modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
        modal.show();
    });
}

function mostrarEntrada({ title = 'Entrada', body = '', inputLabel = 'Valor', confirmText = 'Aceptar', cancelText = 'Cancelar' }) {
    const modalEl = document.getElementById('appModal');
    const titulo = document.getElementById('appModalLabel');
    const contenido = document.getElementById('appModalBody');
    const footer = document.getElementById('appModalFooter');
    const modal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });

    titulo.innerText = title;
    contenido.innerHTML = `
        <p>${body}</p>
        <div class="mb-3">
            <label class="form-label">${inputLabel}</label>
            <input type="number" min="1" class="form-control" id="appModalInput" />
        </div>`;
    footer.innerHTML = `
        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">${cancelText}</button>
        <button type="button" class="btn btn-primary btn-sm" id="appModalConfirmBtn">${confirmText}</button>`;

    return new Promise(resolve => {
        let confirmed = false;
        const confirmBtn = document.getElementById('appModalConfirmBtn');

        const cerrar = () => {
            confirmBtn.removeEventListener('click', onConfirm);
            modalEl.removeEventListener('hidden.bs.modal', onHidden);
        };

        const onConfirm = () => {
            const value = document.getElementById('appModalInput').value;
            if (!value || isNaN(value) || parseInt(value) <= 0) {
                mostrarToast('Ingresa una cantidad válida.', 'warning');
                return;
            }
            confirmed = true;
            cerrar();
            modal.hide();
            resolve(parseInt(value));
        };

        const onHidden = () => {
            cerrar();
            if (!confirmed) resolve(null);
        };

        confirmBtn.addEventListener('click', onConfirm);
        modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
        modal.show();
    });
}

// --- CARGA DE DATOS ---
async function cargarDatos() {
    try {
        const respuesta = await fetch(URL_SCRIPT);
        const datos = await respuesta.json();

        inventario = datos.inventario;
        ventasRealizadas = datos.ventas;
        gastos = datos.gastos || [];

        renderizarInventario();
        if (esCliente) {
            if (document.getElementById('header-container')) document.getElementById('header-container').style.display = 'none';
            const formRegistro = document.querySelector('#vista-inventario .card');
            if (formRegistro) formRegistro.style.display = 'none';
            const btnCostos = document.querySelector('button[onclick="alternarCostos()"]');
            if (btnCostos) btnCostos.style.display = 'none';
        }
        renderizarHistorial();
        renderizarGastos();
        calcularBalance();

        const vistaGuardada = esCliente ? 'inventario' : localStorage.getItem('joyeria_admin_vista') || 'inventario';
        cambiarVista(vistaGuardada);
    } catch (error) {
        console.error("Error cargando datos:", error);
    }
}

async function agregarGasto(btn) {
    const desc = document.getElementById('gastoDesc').value;
    const monto = parseInt(document.getElementById('gastoMonto').value);

    if (!desc || isNaN(monto)) {
        mostrarToast("Pon una descripción y el monto del gasto.", 'warning');
        return;
    }
    if (btn) bloquearBoton(btn, 'Guardando...');

    const nuevoGasto = {
        tipo: "NUEVO_GASTO",
        token: TOKEN,
        fecha: new Date().toLocaleString(),
        descripcion: desc,
        monto: monto
    };

    document.body.style.cursor = 'wait';
    try {
        await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(nuevoGasto) });
        mostrarToast("Gasto registrado correctamente.", 'success');
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
    // Los mostramos del más nuevo al más viejo
    [...gastos].reverse().forEach(g => {
        lista.innerHTML += `
            <tr>
                <td style="font-size:0.75rem">${g.fecha.split(',')[0]}</td>
                <td>${g.descripcion}</td>
                <td class="text-end text-danger">-$${parseInt(g.monto).toLocaleString()}</td>
            </tr>`;
    });

    // Calcular total ventas y suma gastos para el total dinero disponible
    let totalVentas = 0;
    ventasRealizadas.forEach(v => {
        totalVentas += parseFloat(v.total) || 0;
    });
    let sumaGastos = 0;
    gastos.forEach(g => {
        sumaGastos += parseFloat(g.monto) || 0;
    });
    const totalDinero = totalVentas - sumaGastos;

    // Agregar fila del total dinero disponible
    lista.innerHTML += `
        <tr class="table-info">
            <td colspan="2" class="fw-bold">Total Dinero Disponible</td>
            <td class="text-end fw-bold text-success">$${Math.round(totalDinero).toLocaleString()}</td>
        </tr>`;
}

// --- NAVEGACIÓN ---
function cambiarVista(vista) {
    if (esCliente && vista !== 'inventario') return;

    vistaActual = vista;
    localStorage.setItem('joyeria_admin_vista', vistaActual);

    const secciones = ['vista-inventario', 'vista-ventas', 'vista-historial', 'vista-balance'];
    secciones.forEach(s => {
        const el = document.getElementById(s);
        if (el) {
            el.classList.toggle('hidden', s !== `vista-${vista}`);
        }
    });

    const links = ["inv", "ventas", "historial", "balance"];
    links.forEach(l => {
        const el = document.getElementById(`btn-vista-${l}`);
        if (el) el.classList.toggle('active', vista === (l === "inv" ? "inventario" : l));
    });

    if (vista === 'ventas') cargarSelectProductos();
    if (vista === 'balance') calcularBalance();
}

function renderizarHistorial() {
    const lista = document.getElementById('listaHistorial');
    if (!lista) return;
    lista.innerHTML = '';

    [...ventasRealizadas].reverse().forEach(v => {
        const partesFecha = String(v.fecha || '').split(',');
        const dia = partesFecha[0] || '';
        const hora = partesFecha[1] ? partesFecha[1].trim() : '';
        const fechaHtml = hora ? `${dia}<br><small class="text-muted">${hora}</small>` : `${dia}`;

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

function calcularBalance() {
    let invInversion = 0;
    let totalVentasBrutas = 0;
    let totalCostosVendido = 0;
    let sumaGastos = 0;

    // 1. Inversión Stock Actual
    inventario.forEach(p => {
        invInversion += parseNumber(p.costo) * parseNumber(p.stock);
    });

    // 2. Ventas y Costos de lo Vendido
    ventasRealizadas.forEach(v => {
        totalVentasBrutas += parseNumber(v.total);

        // El campo de costo en las ventas se llama "costo"
        let cVenta = parseNumber(v.costo);
        totalCostosVendido += cVenta;
    });

    // 3. Gastos extras registrados
    gastos.forEach(g => {
        sumaGastos += parseNumber(g.monto);
    });

    // 4. OPERACIONES FINALES
    const gananciaReal = totalVentasBrutas - totalCostosVendido - sumaGastos;

    // ACTUALIZACIÓN DE LA INTERFAZ
    if (document.getElementById('balInversion')) document.getElementById('balInversion').innerText = `$${Math.round(invInversion).toLocaleString()}`;
    if (document.getElementById('balVentas')) document.getElementById('balVentas').innerText = `$${Math.round(totalVentasBrutas).toLocaleString()}`;
    if (document.getElementById('balCostoVentas')) document.getElementById('balCostoVentas').innerText = `$${Math.round(totalCostosVendido).toLocaleString()}`;
    if (document.getElementById('balGanancia')) document.getElementById('balGanancia').innerText = `$${Math.round(gananciaReal).toLocaleString()}`;

    // Color de la tarjeta de Ganancia
    const elGanancia = document.getElementById('balGanancia');
    if (elGanancia) {
        elGanancia.parentElement.className = gananciaReal < 0 ?
            "card p-4 bg-danger text-white text-center" :
            "card p-4 bg-primary text-white text-center";
    }
}

function alternarCostos() {
    mostrarCostos = !mostrarCostos;
    document.getElementById('btnVisibilidad').innerHTML = mostrarCostos ? "🙈 Ocultar Costos" : "👁️ Mostrar Costos";
    renderizarInventario();
}

function renderizarInventario() {
    const contenedor = document.getElementById('contenedorInventario');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    const materiales = [...new Set(inventario.map(j => j.material || "Sin Clasificar"))];

    materiales.forEach(mat => {
        contenedor.innerHTML += `
            <div class="col-12 mt-4 mb-2">
                <h4 class="text-uppercase fw-bold border-bottom pb-2" style="color: #014421;">
                    ✨ ${mat}
                </h4>
            </div>`;

        const joyasFiltradas = inventario.filter(j => {
            const coincideMaterial = (j.material || "Sin Clasificar") === mat;
            if (esCliente) return coincideMaterial && (parseInt(j.stock) > 0);
            return coincideMaterial;
        });

        joyasFiltradas.forEach(joya => {
const costoNum = parseNumber(joya.costo);
        const precioNum = parseNumber(joya.precio);
            const urlImg = joya.imagen || "https://via.placeholder.com/400?text=Joyas";
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

// --- EDICIÓN ---
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
    btn.innerText = "Actualizar";
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
        tipo: "EDITAR_PRODUCTO",
        token: TOKEN,
        id: editandoId,
        nombre: nombre,
        categoria: document.getElementById('categoriaJoya').value,
        material: document.getElementById('materialJoya').value,
        costo: costo,
        precio: precio,
        stock: stock,
        imagen: nombreArchivo ? "img/" + nombreArchivo : ""
    };

    document.body.style.cursor = 'wait';
    try {
        await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(editado) });
        mostrarToast("Producto actualizado.", 'success');
        location.reload();
    } catch (error) {
        mostrarToast('Error al actualizar el producto.', 'danger');
        if (btn) desbloquearBoton(btn);
    } finally {
        document.body.style.cursor = 'default';
    }
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
        mostrarToast("Faltan datos.", 'warning');
        return;
    }
    if (btn) bloquearBoton(btn, 'Guardando...');

    let imagenData = nombreImagen ? "img/" + nombreImagen : "https://via.placeholder.com/400?text=Joyas";

    const nuevo = {
        tipo: "NUEVO_PRODUCTO",
        token: TOKEN,
        id: Date.now(),
        nombre, categoria, material, costo, precio, stock,
        imagen: imagenData
    };

    document.body.style.cursor = 'wait';
    try {
        await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(nuevo) });
        mostrarToast("Producto guardado con éxito.", 'success');
        location.reload();
    } catch (error) {
        mostrarToast('Error al guardar el producto.', 'danger');
        if (btn) desbloquearBoton(btn);
    } finally {
        document.body.style.cursor = 'default';
    }
}

// --- VENTAS ---
function cargarSelectProductos() {
    const select = document.getElementById('seleccionarProducto');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Elegir producto...</option>';
    inventario.forEach(p => {
        if (p.stock > 0) select.innerHTML += `<option value="${p.id}">${p.nombre} ($${parseInt(p.precio).toLocaleString()})</option>`;
    });
}

function agregarAlCarrito(btn) {
    const id = parseInt(document.getElementById('seleccionarProducto').value);
    const cant = parseInt(document.getElementById('ventaCantidad').value);

    const p = inventario.find(i => i.id == id);
    if (!p || isNaN(cant) || cant <= 0) {
        mostrarToast("Selecciona un producto y cantidad válida.", 'warning');
        return;
    }
    if (cant > p.stock) {
        mostrarToast("No hay suficiente stock.", 'warning');
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

    // Si el usuario puso un precio manual, usamos ese. Si no, el subtotal.
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
        tipo: "VENTA",
        token: TOKEN,
        fecha: new Date().toLocaleString(),
        cliente: document.getElementById('clienteNombre').value || "General",
        telefono: document.getElementById('clienteTel').value || "---",
        productos: carrito.map(p => `${p.nombre} (x${p.cantidad})`).join(", "),
        total: totalFinal,
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

async function cargarHeader() {
    try {
        const r = await fetch('header.html');
        document.getElementById('header-container').innerHTML = await r.text();
    } catch (e) { console.log(e); }
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
        tipo: "SUMAR_STOCK",
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
        tipo: "ELIMINAR_PRODUCTO",
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

async function init() {
    await cargarHeader();
    await cargarDatos();
}
init();