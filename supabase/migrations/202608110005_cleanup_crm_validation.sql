-- Limpieza única de la nota creada durante la validación técnica del CRM.
-- No modifica prospectos reales ni abre permisos de borrado del historial.

delete from public.commercial_prospect_interactions
where id = '7f68338c-f879-423e-9d46-5cf52b594dd6'
  and summary = 'Prueba técnica CRM; eliminar al cerrar.';
