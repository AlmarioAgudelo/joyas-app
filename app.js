let mostrarCostos = false;
let inventario = [];
let carrito = [];
let ventasRealizadas = [];

const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbz8Bdp7ft_bRkzWlWO1D3kN777_VtzMuy8BVHaRlyAsSPQlu1wB37yPdl9rI8Uf1GSesg/exec";

// --- CARGA DE DATOS ---
async function cargarDatos() {
    try {
        const respuesta = await fetch(URL_SCRIPT);
        const datos = await respuesta.json();

        inventario = datos.inventario; // Guardamos inventario
        ventasRealizadas = datos.ventas; // Guardamos historial

        renderizarInventario();
        renderizarHistorial(); // Nueva función
        calcularBalance();      // Para que los números se actualicen
    } catch (error) {
        console.error("Error cargando datos:", error);
    }
}

// --- NAVEGACIÓN ---
function cambiarVista(vista) {
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

    inventario.forEach(joya => {
        const costoNum = parseInt(joya.costo) || 0;
        const precioNum = parseInt(joya.precio) || 0;
        const urlImg = joya.imagen || "https://via.placeholder.com/400?text=Joyas";

        const htmlCosto = mostrarCostos ? `
            <div class="bg-light rounded p-1 mb-2">
                <p class="text-danger small mb-0">C: $${costoNum.toLocaleString()}</p>
                <p class="text-primary small mb-0">G: $${(precioNum - costoNum).toLocaleString()}</p>
            </div>` : '';

        contenedor.innerHTML += `
            <div class="col-6 col-md-3 mb-4">
                <div class="card card-joya shadow-sm h-100">
                    <img src="${urlImg}" class="img-cuadrada">
                    <div class="card-body text-center p-2">
                        <h6 class="mb-1 text-truncate">${joya.nombre}</h6>
                        ${htmlCosto}
                        <p class="text-muted mb-1 fw-bold">$${precioNum.toLocaleString()}</p>
                        <p class="small mb-0 ${joya.stock < 5 ? 'text-danger' : 'text-success'}">Stock: ${joya.stock}</p>
                    </div>
                </div>
            </div>`;
    });
}

async function agregarProducto() {
    const nombre = document.getElementById('nombreJoya').value;
    const categoria = document.getElementById('categoriaJoya').value;
    const imagen = document.getElementById('imagenJoya').value;
    const costo = parseInt(document.getElementById('costoJoya').value);
    const precio = parseInt(document.getElementById('precioJoya').value);
    const stock = parseInt(document.getElementById('stockJoya').value);

    if (nombre && categoria && !isNaN(costo) && !isNaN(precio) && !isNaN(stock)) {
        const nuevo = { tipo: "NUEVO_PRODUCTO", id: Date.now(), nombre, categoria, costo, precio, stock, imagen };
        await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(nuevo) });
        alert("Guardado.");
        location.reload();
    } else { alert("Faltan datos."); }
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

cargarHeader();
cargarDatos();