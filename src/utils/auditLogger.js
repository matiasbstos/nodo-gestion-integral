import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Robust Utility function to write audit logs to Firestore ('auditoria' collection)
 * Supports multiple calling formats:
 * - logAuditAction(db, { accion, detalles, usuario, targetFuncionario, categoria, esModoPrueba })
 * - logAuditAction({ accion, detalles, usuario, targetFuncionario, categoria, esModoPrueba })
 * - logAuditAction('ACCION', 'Detalles', usuario, targetFuncionario)
 */
export const logAuditAction = async (dbOrPayload, payloadOrDetails, optionalUser, optionalTarget, optionalCategory) => {
  try {
    let dbInstance = db;
    let payload = {};

    if (dbOrPayload && typeof dbOrPayload === 'object' && (dbOrPayload.app || dbOrPayload._delegate)) {
      dbInstance = dbOrPayload;
      payload = payloadOrDetails || {};
    } else if (typeof dbOrPayload === 'object') {
      payload = dbOrPayload;
    } else if (typeof dbOrPayload === 'string') {
      payload = {
        accion: dbOrPayload,
        detalles: payloadOrDetails || '',
        usuario: optionalUser || null,
        targetFuncionario: optionalTarget || null,
        categoria: optionalCategory || 'general'
      };
    }

    const { usuario, accion, detalles, targetFuncionario, categoria, esModoPrueba } = payload;
    const now = new Date();

    const auditData = {
      timestamp: now.toISOString(),
      fechaFormateada: now.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      usuarioNombre: usuario?.nombre || usuario?.displayName || 'Matias Eduardo Bustos Huerta',
      usuarioRut: usuario?.rut || usuario?.id || '18.487.775-9',
      usuarioRol: usuario?.role || usuario?.tipoPrestador || 'admin_global',
      accion: accion || 'ACCION_REGISTRADA',
      detalles: detalles || '',
      targetNombre: targetFuncionario?.nombre || targetFuncionario?.funcionarioNombre || usuario?.nombre || 'Matias Eduardo Bustos Huerta',
      targetRut: targetFuncionario?.rut || targetFuncionario?.funcionarioRut || usuario?.rut || '18.487.775-9',
      categoria: categoria || 'general',
      esModoPrueba: Boolean(esModoPrueba || usuario?.modoPruebaActivo || usuario?.esPrueba || (accion || '').includes('PRUEBA') || (detalles || '').includes('prueba'))
    };

    await addDoc(collection(dbInstance, 'auditoria'), auditData);
    console.log("Audit log successfully recorded:", auditData);
  } catch (error) {
    console.warn("Could not write to Firestore audit collection:", error.message);
  }
};
