import { collection, addDoc } from 'firebase/firestore';

/**
 * Utility function to write audit logs to Firestore ('auditoria' collection)
 */
export const logAuditAction = async (db, {
  usuario = null,
  accion = 'ACCION_DESCONOCIDA',
  detalles = '',
  targetFuncionario = null,
  categoria = 'general'
}) => {
  try {
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
      usuarioNombre: usuario?.nombre || usuario?.displayName || 'Administrador Global',
      usuarioRut: usuario?.rut || usuario?.id || '184877759',
      usuarioRol: usuario?.role || 'admin_global',
      accion: accion,
      detalles: detalles,
      targetNombre: targetFuncionario?.nombre || targetFuncionario?.funcionarioNombre || '',
      targetRut: targetFuncionario?.rut || targetFuncionario?.funcionarioRut || '',
      categoria: categoria
    };

    await addDoc(collection(db, 'auditoria'), auditData);
    console.log("Audit log recorded:", auditData);
  } catch (error) {
    console.error("Error writing audit log:", error);
  }
};
