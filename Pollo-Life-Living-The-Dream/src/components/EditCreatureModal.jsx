import Modal from './Modal';
import CreatureForm from './CreatureForm';
import { useCreatures } from '../creatures/useCreatures';

export default function EditCreatureModal({ creature, onClose }) {
  const { entry, update } = useCreatures();
  const catalogEntry = entry(creature.type);

  return (
    <Modal title={`Edit ${creature.nickname || catalogEntry?.name || 'creature'}`} onClose={onClose}>
      {catalogEntry ? (
        <CreatureForm
          entry={catalogEntry}
          initial={creature}
          submitLabel="Save"
          onCancel={onClose}
          onSubmit={async ({ data, nickname }) => {
            await update(creature._id, { data, nickname: nickname ?? '' });
            onClose();
          }}
        />
      ) : (
        <p className="form-error">Unknown creature type.</p>
      )}
    </Modal>
  );
}
