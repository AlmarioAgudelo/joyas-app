const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbz_csuM93JFRcvqe6mlI9LAdwmDNxD_T5sU2jD_Id3yt5iNJAI5AhYYmEXEPdA6lPOOfQ/exec"; // REEMPLAZA CON TU URL
const TOKEN = "ALPEZ_2026_SEGURIDAD_99"; // ESTE TOKEN DEBE SER IGUAL AL QUE PUSISTE EN EL GOOGLE SCRIPT

const urlParams = new URLSearchParams(window.location.search);
const esCliente = urlParams.get('vista') === 'cliente';
let mostrarCostos = false;
let inventario = [];
let carrito = [];
let ventasRealizadas = [];
let editandoId = null;
let gastos = [];

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
    } catch (error) {
        console.error("Error cargando datos:", error);
    }
}

async function agregarGasto() {
    const desc = document.getElementById('gastoDesc').value;
    const monto = parseInt(document.getElementById('gastoMonto').value);

    if (!desc || isNaN(monto)) return alert("Pon una descripción y el monto del gasto.");

    const nuevoGasto = {
        tipo: "NUEVO_GASTO",
        token: TOKEN,
        fecha: new Date().toLocaleString(),
        descripcion: desc,
        monto: monto
    };

    document.body.style.cursor = 'wait';
    await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(nuevoGasto) });
    alert("Gasto restado del balance.");
    location.reload();
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
}

// --- NAVEGACIÓN ---
function cambiarVista(vista) {
    if (esCliente && vista !== 'inventario') return;

    // Seleccionamos todas las secciones posibles
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

function calcularBalance() {
    let invInversion = 0;
    let totalVentasBrutas = 0;
    let totalCostosVendido = 0;
    let sumaGastos = 0;

    // 1. Inversión Stock: Suma de (Costo * Stock) de lo que hay en estantes.
    inventario.forEach(p => invInversion += (parseFloat(p.costo) || 0) * (parseInt(p.stock) || 0));

    // 2. Ventas Totales y Costos de lo Vendido:
    ventasRealizadas.forEach(v => {
        totalVentasBrutas += parseFloat(v.total) || 0;       // El dinero total que entró de ventas
        totalCostosVendido += parseFloat(v.costoTotal) || 0; // Lo que te costaron esas piezas vendidas
    });

    // 3. Gastos: Suma de todos los gastos registrados (comida, transporte, etc.)
    gastos.forEach(g => sumaGastos += parseFloat(g.monto) || 0);

    // 4. Ganancia Real: Ventas Totales - Costo de lo Vendido - Gastos
    const gananciaReal = totalVentasBrutas - totalCostosVendido - sumaGastos;

    // Actualizar la pantalla con tus definiciones
    document.getElementById('balInversion').innerText = `$${invInversion.toLocaleString()}`;
    document.getElementById('balVentas').innerText = `$${totalVentasBrutas.toLocaleString()}`;
    document.getElementById('balCostoVentas').innerText = `$${totalCostosVendido.toLocaleString()}`;
    document.getElementById('balGanancia').innerText = `$${gananciaReal.toLocaleString()}`;

    // Color de la tarjeta según si hay ganancia o pérdida
    const elGanancia = document.getElementById('balGanancia');
    elGanancia.parentElement.className = gananciaReal < 0 ? "card p-4 bg-danger text-white text-center" : "card p-4 bg-primary text-white text-center";
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
                            <div class="d-flex align-items-center justify-content-center gap-1 flex-wrap">
                                ${!esCliente ? `
                                    <p class="small mb-0 w-100 ${joya.stock < 5 ? 'text-danger' : 'text-success'}">Stock: ${joya.stock}</p>
                                    <button class="btn btn-sm btn-outline-warning py-0 px-2" onclick="prepararEdicion(${joya.id})">✏️</button>
                                    <button class="btn btn-sm btn-outline-primary py-0 px-2 fw-bold" onclick="sumarStock(${joya.id}, '${nombreEscapado}')">+</button>
                                    <button class="btn btn-sm btn-outline-danger py-0 px-2 fw-bold" onclick="eliminarProducto(${joya.id}, '${nombreEscapado}')">&times;</button>
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
    btn.onclick = ejecutarEdicion;

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function ejecutarEdicion() {
    const nombre = document.getElementById('nombreJoya').value;
    const costo = parseInt(document.getElementById('costoJoya').value);
    const precio = parseInt(document.getElementById('precioJoya').value);
    const stock = parseInt(document.getElementById('stockJoya').value);
    const nombreArchivo = document.getElementById('imagenJoya').value;

    const editado = {
        tipo: "EDITAR_PRODUCTO",
        token: TOKEN, // <--- LLAVE AGREGADA
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
    await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(editado) });
    alert("Producto actualizado");
    location.reload();
}

async function agregarProducto() {
    const nombre = document.getElementById('nombreJoya').value;
    const categoria = document.getElementById('categoriaJoya').value;
    const material = document.getElementById('materialJoya').value;
    const nombreImagen = document.getElementById('imagenJoya').value;
    const costo = parseInt(document.getElementById('costoJoya').value);
    const precio = parseInt(document.getElementById('precioJoya').value);
    const stock = parseInt(document.getElementById('stockJoya').value);

    if (!nombre || !categoria || !material || isNaN(costo) || isNaN(precio) || isNaN(stock)) {
        return alert("Faltan datos.");
    }

    let imagenData = nombreImagen ? "img/" + nombreImagen : "https://via.placeholder.com/400?text=Joyas";

    const nuevo = {
        tipo: "NUEVO_PRODUCTO",
        token: TOKEN, // <--- LLAVE AGREGADA
        id: Date.now(),
        nombre, categoria, material, costo, precio, stock,
        imagen: imagenData
    };

    document.body.style.cursor = 'wait';
    await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(nuevo) });
    alert("Producto guardado con éxito.");
    location.reload();
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

function agregarAlCarrito() {
    const id = parseInt(document.getElementById('seleccionarProducto').value);
    const cant = parseInt(document.getElementById('ventaCantidad').value);

    const p = inventario.find(i => i.id == id);
    if (!p || isNaN(cant) || cant <= 0) return alert("Selecciona un producto y cantidad válida.");

    // Verificamos si hay stock suficiente antes de agregar al carrito
    if (cant > p.stock) return alert("No hay suficiente stock.");

    // Agregamos al carrito usando el precio original (sin regateo aquí)
    carrito.push({ ...p, cantidad: cant, precioFinal: p.precio });

    renderizarCarrito();
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

async function finalizarVenta() {
    if (carrito.length === 0) return;

    const subtotalVenta = carrito.reduce((s, i) => s + (i.precioFinal * i.cantidad), 0);
    const precioManual = parseInt(document.getElementById('precioFinalAjustado').value);

    // El total final será el manual si existe, si no, el subtotal
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
    await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(datosVenta) });
    alert(`Venta cerrada por $${totalFinal.toLocaleString()}`);
    location.reload();
}

async function cargarHeader() {
    try {
        const r = await fetch('header.html');
        document.getElementById('header-container').innerHTML = await r.text();
    } catch (e) { console.log(e); }
}

async function sumarStock(id, nombre) {
    const cantidad = prompt(`¿Cuántas unidades de "${nombre}" quieres agregar?`);
    if (!cantidad || isNaN(cantidad) || parseInt(cantidad) <= 0) return;
    const data = {
        tipo: "SUMAR_STOCK",
        token: TOKEN, // <--- LLAVE AGREGADA
        id: id,
        cantidad: parseInt(cantidad)
    };
    document.body.style.cursor = 'wait';
    await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
    location.reload();
}

async function eliminarProducto(id, nombre) {
    if (confirm(`¿Eliminar "${nombre}"?`)) {
        const data = {
            tipo: "ELIMINAR_PRODUCTO",
            token: TOKEN, // <--- LLAVE AGREGADA
            id: id
        };
        document.body.style.cursor = 'wait';
        await fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
        location.reload();
    }
}

cargarHeader();
cargarDatos();