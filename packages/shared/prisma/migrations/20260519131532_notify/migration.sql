CREATE OR REPLACE FUNCTION notify_task_changes()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'task_updates',
    json_build_object(
      'id', NEW.id,
      'missionId', NEW."missionId",
      'status', NEW.status,
      'title', NEW.title,
      'order', NEW.order,
      'type', COALESCE(NEW.type, 'CODE')
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER task_update_trigger
AFTER UPDATE ON "Task"
FOR EACH ROW
EXECUTE FUNCTION notify_task_changes();
