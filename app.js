const urlParams = new URLSearchParams(window.location.search);
const esCliente = urlParams.get('vista') === 'cliente';
let mostrarCostos = false;
let inventario = [];
let carrito = [];
let ventasRealizadas = [];

const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbwOUW5kZNQkS9UasCbSN-d5kEcwrTcnYHVj64ZovFtmaI9ITDQIPlktB8EZOoJPr8D-sg/exec";

// --- CARGA DE DATOS ---
async function cargarDatos() {
    try {
        const respuesta = await fetch(URL_SCRIPT);
        const datos = await respuesta.json();

        inventario = datos.inventario; // Guardamos inventario
        ventasRealizadas = datos.ventas; // Guardamos historial

        renderizarInventario();
        if (esCliente) {
            if (document.getElementById('header-container')) document.getElementById('header-container').style.display = 'none';
            const formRegistro = document.querySelector('#vista-inventario .card');
            if (formRegistro) formRegistro.style.display = 'none';
            const btnCostos = document.querySelector('button[onclick="alternarCostos()"]');
            if (btnCostos) btnCostos.style.display = 'none';
        }
        renderizarHistorial(); // Nueva función
        calcularBalance();      // Para que los números se actualicen
    } catch (error) {
        console.error("Error cargando datos:", error);
    }
}

// --- NAVEGACIÓN ---
function cambiarVista(vista) {
    if (esCliente && vista !== 'inventario') return;

    document.getElementById('vista-inventario').classList.toggle('hidden', vista !== 'inventario');
    document.getElementById('vista-inventario').classList.toggle('hidden', vista !== 'inventario');
    document.getElementById('vista-ventas').classList.toggle('hidden', vista !== 'ventas');
    document.getElementById('vista-historial').classList.toggle('hidden', vista !== 'historial');

    const vistaBalance = document.getElementById('vista-balance');
    if (vistaBalance) vistaBalance.classList.toggle('hidden', vista !== 'balance');

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
        lista.innerHTML += `
            <tr>
                <td style="font-size: 0.8rem;">${v.fecha}</td>
                <td>
                    <div class="fw-bold">${v.cliente}</div>
                    <div class="text-muted small">${v.telefono || ''}</div>
                </td>
                <td class="small text-truncate" style="max-width: 200px;">${v.productos}</td>
                <td class="text-end fw-bold">$${parseInt(v.total).toLocaleString()}</td>
            </tr>`;
    });
}

// --- BALANCE (CORREGIDO MULTIPLICACIÓN) ---
function calcularBalance() {
    let invInversion = 0;
    let totalVentas = 0;
    let totalCostos = 0;

    // Inversión en lo que hay en estantes
    inventario.forEach(p => invInversion += (parseFloat(p.costo) || 0) * (parseInt(p.stock) || 0));

    // Totales de lo que ya se vendió
    ventasRealizadas.forEach(v => {
        totalVentas += parseFloat(v.total) || 0;
        totalCostos += parseFloat(v.costo) || 0; // Esta es la nueva columna
    });

    const ganancia = totalVentas - totalCostos;

    document.getElementById('balInversion').innerText = `$${invInversion.toLocaleString()}`;
    document.getElementById('balVentas').innerText = `$${totalVentas.toLocaleString()}`;
    document.getElementById('balCostoVentas').innerText = `$${totalCostos.toLocaleString()}`;
    document.getElementById('balGanancia').innerText = `$${ganancia.toLocaleString()}`;
}

// --- INVENTARIO ---
function alternarCostos() {
    mostrarCostos = !mostrarCostos;
    document.getElementById('btnVisibilidad').innerHTML = mostrarCostos ? "🙈 Ocultar Costos" : "👁️ Mostrar Costos";
    renderizarInventario();
}

function renderizarInventario() {
    const contenedor = document.getElementById('contenedorInventario');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    // 1. Obtener materiales únicos
    const materiales = [...new Set(inventario.map(j => j.material || "Sin Clasificar"))];

    materiales.forEach(mat => {
        // Añadir encabezado de sección
        contenedor.innerHTML += `
            <div class="col-12 mt-4 mb-2">
                <h4 class="text-uppercase fw-bold border-bottom pb-2" style="color: #014421;">
                    ✨ ${mat}
                </h4>
            </div>`;

        // Filtrar joyas de este material (y ocultar stock 0 si es cliente)
        const joyasFiltradas = inventario.filter(j => {
            const coincideMaterial = (j.material || "Sin Clasificar") === mat;
            if (esCliente) {
                return coincideMaterial && (parseInt(j.stock) > 0);
            }
            return coincideMaterial;
        });

        joyasFiltradas.forEach(joya => {
            const costoNum = parseInt(joya.costo) || 0;
            const precioNum = parseInt(joya.precio) || 0;
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
                            <div class="d-flex align-items-center justify-content-center gap-2">
                                ${!esCliente ? `
                                    <p class="small mb-0 ${joya.stock < 5 ? 'text-danger' : 'text-success'}">Stock: ${joya.stock}</p>
                                    <button class="btn btn-sm btn-outline-primary py-0 px-2 fw-bold" 
                                            onclick="sumarStock(${joya.id}, '${nombreEscapado}')">
                                        +
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger py-0 px-2 fw-bold" 
                                            onclick="eliminarProducto(${joya.id}, '${nombreEscapado}')">
                                        &times;
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>`;
        });
    });
}

async function agregarProducto() {
    const nombre = document.getElementById('nombreJoya').value;
    const categoria = document.getElementById('categoriaJoya').value;
    const material = document.getElementById('materialJoya').value; // Nuevo
    const imagen = document.getElementById('imagenJoya').value;
    const costo = parseInt(document.getElementById('costoJoya').value);
    const precio = parseInt(document.getElementById('precioJoya').value);
    const stock = parseInt(document.getElementById('stockJoya').value);

    if (nombre && categoria && material && !isNaN(costo) && !isNaN(precio) && !isNaN(stock)) {
        const nuevo = {
            tipo: "NUEVO_PRODUCTO",
            id: Date.now(),
            nombre,
            categoria,
            material, // Nuevo
            costo,
            precio,
            stock,
            imagen
        };
        await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(nuevo) });
        alert("Guardado.");
        location.reload();
    } else { alert("Faltan datos (incluyendo el Material)."); }
}

// --- VENTAS ---
function cargarSelectProductos() {
    const select = document.getElementById('seleccionarProducto');
    select.innerHTML = '<option value="" disabled selected>Elegir producto...</option>';
    inventario.forEach(p => {
        if (p.stock > 0) select.innerHTML += `<option value="${p.id}">${p.nombre} ($${parseInt(p.precio).toLocaleString()})</option>`;
    });
}

function agregarAlCarrito() {
    const id = parseInt(document.getElementById('seleccionarProducto').value);
    const cant = parseInt(document.getElementById('ventaCantidad').value);
    const regateo = parseInt(document.getElementById('precioRegateo').value);
    const p = inventario.find(i => i.id == id);

    if (!p || isNaN(cant)) return alert("Error");
    const precioFinal = !isNaN(regateo) ? regateo : p.precio;

    carrito.push({ ...p, cantidad: cant, precioFinal: precioFinal });
    document.getElementById('precioRegateo').value = '';
    renderizarCarrito();
}

function renderizarCarrito() {
    const lista = document.getElementById('listaCarrito');
    let total = 0;
    lista.innerHTML = '';
    carrito.forEach((item, index) => {
        const sub = item.precioFinal * item.cantidad;
        total += sub;
        lista.innerHTML += `<tr><td>${item.nombre}</td><td>${item.cantidad}</td><td>$${sub.toLocaleString()}</td><td><button class="btn btn-sm text-danger" onclick="eliminarItem(${index})">x</button></td></tr>`;
    });
    document.getElementById('totalVenta').innerText = `Total: $${total.toLocaleString()}`;
}

function eliminarItem(index) {
    carrito.splice(index, 1);
    renderizarCarrito();
}

let enviandoVenta = false; // 1. Variable para evitar duplicados

async function finalizarVenta() {
    if (carrito.length === 0 || enviandoVenta) return;

    enviandoVenta = true;
    const costoTotalVenta = carrito.reduce((s, i) => s + (i.costo * i.cantidad), 0);
    const totalVenta = carrito.reduce((s, i) => s + (i.precioFinal * i.cantidad), 0);

    const datosVenta = {
        tipo: "VENTA",
        fecha: new Date().toLocaleString(),
        cliente: document.getElementById('clienteNombre').value || "General",
        telefono: document.getElementById('clienteTel').value || "---",
        productos: carrito.map(p => `${p.nombre} (x${p.cantidad})`).join(", "),
        total: totalVenta,
        costoTotal: costoTotalVenta, // Enviamos el costo para el balance
        detalles: carrito.map(p => ({ id: p.id, cantidad: p.cantidad }))
    };

    await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(datosVenta) });
    alert("Venta Exitosa");
    location.reload();
}

async function cargarHeader() {
    try {
        const r = await fetch('header.html');
        document.getElementById('header-container').innerHTML = await r.text();
    } catch (e) { console.log(e); }
}

async function sumarStock(id, nombre) {
    const cantidad = prompt(`¿Cuántas unidades de "${nombre}" quieres agregar al inventario?`);

    // Validamos que sea un número válido
    if (!cantidad || isNaN(cantidad) || parseInt(cantidad) <= 0) return;

    if (confirm(`Se sumarán ${cantidad} unidades a ${nombre}. ¿Continuar?`)) {
        const data = { tipo: "SUMAR_STOCK", id: id, cantidad: parseInt(cantidad) };

        // Bloqueamos la pantalla un momento
        document.body.style.cursor = 'wait';

        await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });

        alert("Stock actualizado correctamente.");
        location.reload();
    }
}

async function eliminarProducto(id, nombre) {
    if (confirm(`¿Estás SEGURO de eliminar "${nombre}"?\nEsta acción lo borrará permanentemente de la lista.`)) {
        const data = { tipo: "ELIMINAR_PRODUCTO", id: id };

        document.body.style.cursor = 'wait';

        await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });

        alert("Producto eliminado.");
        location.reload();
    }
}

cargarHeader();
cargarDatos();