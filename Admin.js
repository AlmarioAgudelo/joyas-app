const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzFKHlBlxsV1xoesUoDI0pYbvrhLZh4XHyGrxR-Czp0R4T6ktphaHTqXQARzVQhLPylLg/exec";
const TOKEN = "ALPEZ_2026_SEGURIDAD_99";

const urlParams = new URLSearchParams(window.location.search);
const esCliente = urlParams.get('vista') === 'cliente';
let mostrarCostos = false;
let inventario = [];
let carrito = [];
let ventasRealizadas = [];
let editandoId = null;
let gastos = [];
let vistaActual = 'inventario';
let config = {}; // NUEVO: Configuración global (versionInventario, etc.)

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
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${texto || btn.dataset.originalHtml}`;
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

async function cargarHeader() {
    try {
        const r = await fetch('header.html');
        document.getElementById('header-container').innerHTML = await r.text();
    } catch (e) {
        console.log(e);
    }
}

async function cargarVistas() {
    const contenedor = document.getElementById('views-container');
    if (!contenedor) return;

    const vistas = ['views/inventario.html', 'views/ventas.html', 'views/balance.html', 'views/historial.html'];
    contenedor.innerHTML = '';

    for (const vista of vistas) {
        try {
            const res = await fetch(vista);
            if (!res.ok) throw new Error(`No se pudo cargar ${vista}`);
            contenedor.innerHTML += await res.text();
        } catch (error) {
            console.error(error);
        }
    }
}

async function cargarDatos() {
    try {
        const respuesta = await fetch(URL_SCRIPT);
        const datos = await respuesta.json();

        inventario = datos.inventario || [];
        ventasRealizadas = datos.ventas || [];
        gastos = datos.gastos || [];
        config = datos.config || {}; // NUEVO: Cargar configuración global

        renderizarInventario();
        renderizarHistorial();
        renderizarGastos();
        calcularBalance();

        const vistaGuardada = esCliente ? 'inventario' : localStorage.getItem('joyeria_admin_vista') || 'inventario';
        cambiarVista(vistaGuardada);
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

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

    const links = ['inv', 'ventas', 'historial', 'balance'];
    links.forEach(l => {
        const el = document.getElementById(`btn-vista-${l}`);
        if (el) el.classList.toggle('active', vista === (l === 'inv' ? 'inventario' : l));
    });

    if (vista === 'ventas') cargarSelectProductos();
    if (vista === 'balance') calcularBalance();
}

async function init() {
    await cargarHeader();
    await cargarVistas();
    await cargarDatos();
}

init();
