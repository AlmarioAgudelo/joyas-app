let mostrarCostos = false;
let inventario = [];
let carrito = [];
let ventasRealizadas = [];

// LA URL DE TU SCRIPT (Asegúrate de que termine en /exec)
const URL_SCRIPT = "https://script.google.com/macros/s/AKfycby7EXPbGEmS9IzcfL-Lao1IJfN7iPaY5HrGX0bhPv4e2uI_8LmY8WkAEqkRcdXT1pKenQ/exec";

// --- PERSISTENCIA (GOOGLE SHEETS) ---

// Carga los datos directamente desde tu hoja de Google
async function cargarDatos() {
    try {
        console.log("Conectando con Google Sheets...");
        const respuesta = await fetch(URL_SCRIPT);
        const datos = await respuesta.json();

        // El script de Google devuelve el inventario
        inventario = datos;

        renderizarInventario();
        console.log("Inventario sincronizado.");
    } catch (error) {
        console.error("Error al cargar desde la nube:", error);
        alert("Error de conexión. Revisa que tu URL de Apps Script sea correcta.");
    }
}

// --- NAVEGACIÓN ---
function cambiarVista(vista) {
    // 1. Mostrar/Ocultar las secciones
    document.getElementById('vista-inventario').classList.toggle('hidden', vista !== 'inventario');
    document.getElementById('vista-ventas').classList.toggle('hidden', vista !== 'ventas');
    document.getElementById('vista-historial').classList.toggle('hidden', vista !== 'historial');
    // Añadimos la nueva vista de balance
    const vistaBalance = document.getElementById('vista-balance');
    if (vistaBalance) vistaBalance.classList.toggle('hidden', vista !== 'balance');

    // 2. Actualizar los botones del menú (el estado "active")
    // Añadimos "balance" a la lista de links
    const links = ["inv", "ventas", "historial", "balance"];
    links.forEach(l => {
        const el = document.getElementById(`btn-vista-${l}`);
        if (el) {
            // Comparamos si el botón actual coincide con la vista seleccionada
            const esActivo = vista === (l === "inv" ? "inventario" : l);
            el.classList.toggle('active', esActivo);
        }
    });

    // 3. Cargar datos específicos de cada vista
    if (vista === 'ventas') cargarSelectProductos();
    if (vista === 'historial') renderizarHistorial();
    // Cuando entres a balance, que ejecute los cálculos
    if (vista === 'balance') calcularBalance();
}

// --- INVENTARIO ---
function alternarCostos() {
    mostrarCostos = !mostrarCostos;
    document.getElementById('btnVisibilidad').innerHTML = mostrarCostos ? "🙈 Ocultar Costos" : "👁️ Mostrar Costos";
    renderizarInventario();
}

function renderizarInventario() {
    const contenedor = document.getElementById('contenedorInventario');
    const displayTotalInversion = document.getElementById('totalInversionInventario');
    if (!contenedor) return;

    contenedor.innerHTML = '';
    let inversionTotal = 0; // Aquí sumaremos todo

    inventario.forEach(joya => {
        // --- Cálculo de Inversión ---
        // Multiplicamos el costo por el stock actual de cada joya
        const costoNum = parseInt(joya.costo) || 0;
        const stockNum = parseInt(joya.stock) || 0;
        inversionTotal += (costoNum * stockNum);

        const urlImg = joya.imagen || "https://via.placeholder.com/400?text=Joyas";
        const htmlCosto = mostrarCostos ? `
            <div class="bg-light rounded p-1 mb-2">
                <p class="text-danger small mb-0">C: $${costoNum.toLocaleString()}</p>
                <p class="text-primary small mb-0">G: $${(parseInt(joya.precio) - costoNum).toLocaleString()}</p>
            </div>` : '';

        contenedor.innerHTML += `
            <div class="col-md-3 mb-4">
                <div class="card card-joya shadow-sm h-100">
                    <img src="${urlImg}" class="img-cuadrada">
                    <div class="card-body text-center p-2">
                        <h6 class="mb-1 text-truncate">${joya.nombre}</h6>
                        ${htmlCosto}
                        <p class="text-muted mb-1 fw-bold">$${parseInt(joya.precio).toLocaleString()}</p>
                        <p class="small mb-0 ${joya.stock < 5 ? 'text-danger' : 'text-success'}">Stock: ${joya.stock}</p>
                    </div>
                </div>
            </div>`;
    });

    // Mostramos el resultado final en la tarjeta que creamos
    if (displayTotalInversion) {
        displayTotalInversion.innerText = `$${inversionTotal.toLocaleString()}`;
    }
}

async function agregarProducto() {
    const nombre = document.getElementById('nombreJoya').value;
    const categoria = document.getElementById('categoriaJoya').value;
    const imagen = document.getElementById('imagenJoya').value;
    const costo = parseInt(document.getElementById('costoJoya').value);
    const precio = parseInt(document.getElementById('precioJoya').value);
    const stock = parseInt(document.getElementById('stockJoya').value);

    if (nombre && categoria && !isNaN(costo) && !isNaN(precio) && !isNaN(stock)) {
        const nuevoProducto = {
            tipo: "NUEVO_PRODUCTO",
            id: Date.now(),
            nombre,
            categoria,
            costo,
            precio,
            stock,
            imagen
        };

        // Enviamos a la nube
        await fetch(URL_SCRIPT, {
            method: 'POST',
            mode: 'no-cors', // Importante para evitar errores de seguridad simples
            body: JSON.stringify(nuevoProducto)
        });

        alert("Producto guardado en Google Sheets.");
        ['nombreJoya', 'categoriaJoya', 'imagenJoya', 'costoJoya', 'precioJoya', 'stockJoya'].forEach(id => document.getElementById(id).value = '');

        // Recargamos los datos para confirmar
        setTimeout(cargarDatos, 1500);
    } else { alert("Completa todos los campos."); }
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
    const precioRegateo = parseInt(document.getElementById('precioRegateo').value);
    const producto = inventario.find(p => p.id == id);

    if (!producto || isNaN(cant)) return alert("Elige producto y cantidad");
    if (cant > producto.stock) return alert("Stock insuficiente");

    // Si escribiste un precio en el nuevo campo, usamos ese. Si no, usamos el del inventario.
    const precioFinal = !isNaN(precioRegateo) ? precioRegateo : producto.precio;

    // Buscamos si ya está en el carrito para no repetir filas
    const yaEsta = carrito.find(c => c.id == id && c.precioFinal === precioFinal);

    if (yaEsta) {
        if (yaEsta.cantidad + cant > producto.stock) return alert("No hay más stock");
        yaEsta.cantidad += cant;
    } else {
        // Guardamos el precioFinal en el objeto del carrito
        carrito.push({ ...producto, cantidad: cant, precioFinal: precioFinal });
    }

    // Limpiar el campo de regateo para la siguiente joya
    document.getElementById('precioRegateo').value = '';
    renderizarCarrito();
}

function renderizarCarrito() {
    const lista = document.getElementById('listaCarrito');
    let total = 0;
    lista.innerHTML = '';

    carrito.forEach((item, index) => {
        // Usamos precioFinal en lugar de item.precio
        const sub = item.precioFinal * item.cantidad;
        total += sub;

        lista.innerHTML += `<tr>
            <td>
                ${item.nombre}
                <br><small class="text-muted">Unit: $${item.precioFinal.toLocaleString()}</small>
            </td>
            <td>${item.cantidad}</td>
            <td>$${sub.toLocaleString()}</td>
            <td><button class="btn btn-sm btn-link text-danger" onclick="eliminarItem(${index})">x</button></td>
        </tr>`;
    });
    document.getElementById('totalVenta').innerText = `Total: $${total.toLocaleString()}`;
}

function eliminarItem(index) {
    carrito.splice(index, 1);
    renderizarCarrito();
}

async function finalizarVenta() {
    if (carrito.length === 0) return alert("Carrito vacío");

    const cliente = document.getElementById('clienteNombre').value || "Cliente General";
    const tel = document.getElementById('clienteTel').value || "---";
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    const datosVenta = {
        tipo: "VENTA",
        fecha: new Date().toLocaleString(),
        cliente: cliente,
        telefono: tel,
        // Aquí detallamos el precio cobrado en el texto que va a Google Sheets
        productos: carrito.map(p => `${p.nombre} (x${p.cantidad}) a $${p.precioFinal}`).join(", "),
        total: total,
        itemsCarrito: carrito
    };

    // Enviar a la nube
    await fetch(URL_SCRIPT, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(datosVenta)
    });

    alert("¡Venta sincronizada con éxito!");

    carrito = [];
    document.getElementById('clienteNombre').value = '';
    document.getElementById('clienteTel').value = '';
    renderizarCarrito();

    // Recargamos el inventario desde la nube para ver el stock actualizado
    setTimeout(cargarDatos, 1500);
    cambiarVista('inventario');
}

// --- HISTORIAL (Solo local para esta sesión o puedes jalarlo de la pestaña Ventas) ---
function renderizarHistorial() {
    const tabla = document.getElementById('listaHistorial');
    tabla.innerHTML = '<tr><td colspan="4" class="text-center">Las ventas se guardan directamente en tu Google Sheet.</td></tr>';
}

// --- CARGA INICIAL ---
async function cargarHeader() {
    try {
        const respuesta = await fetch('header.html');
        const contenido = await respuesta.text();
        document.getElementById('header-container').innerHTML = contenido;
    } catch (error) {
        console.error("Error cargando el header:", error);
    }
}

// Ejecución al iniciar
cargarHeader();
cargarDatos(); // Trae todo de Google Sheets al abrir
function calcularBalance() {
    // 1. Calcular Inversión en Inventario (Lo que tienes en estantes)
    let invTotal = inventario.reduce((acc, p) => acc + (parseFloat(p.costo || 0) * parseInt(p.stock || 0)), 0);

    // 2. Calcular Ventas y Ganancias desde el Historial
    // Nota: Necesitas que tu Google Sheets también te devuelva el historial de ventas
    // Si aún no lo descargas, usaremos los datos locales de la sesión:
    let ventasTotales = 0;
    let costoDeVentas = 0;

    ventasRealizadas.forEach(v => {
        ventasTotales += parseFloat(v.total || 0);
        // Aquí sumamos el costo de cada producto vendido
        v.productos.forEach(p => {
            // Buscamos el costo original del producto
            costoDeVentas += (parseFloat(p.costo || 0) * parseInt(p.cantidad || 0));
        });
    });

    let gananciaNeta = ventasTotales - costoDeVentas;

    // Mostrar en pantalla
    document.getElementById('balInversion').innerText = `$${invTotal.toLocaleString()}`;
    document.getElementById('balVentas').innerText = `$${ventasTotales.toLocaleString()}`;
    document.getElementById('balCostoVentas').innerText = `$${costoDeVentas.toLocaleString()}`;
    document.getElementById('balGanancia').innerText = `$${gananciaNeta.toLocaleString()}`;
}