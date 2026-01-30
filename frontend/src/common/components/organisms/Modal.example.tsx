import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from '../atoms/Button';

/**
 * Modal Component Examples
 *
 * This file demonstrates various use cases of the Modal component.
 */

export const ModalExamples: React.FC = () => {
  const [basicModalOpen, setBasicModalOpen] = useState(false);
  const [withFooterModalOpen, setWithFooterModalOpen] = useState(false);
  const [largeModalOpen, setLargeModalOpen] = useState(false);
  const [fullModalOpen, setFullModalOpen] = useState(false);
  const [noBackdropCloseModalOpen, setNoBackdropCloseModalOpen] = useState(false);

  return (
    <div className="p-8 space-y-6 bg-background-primary min-h-screen">
      <h1 className="text-3xl font-bold text-text-primary mb-8">Modal Component Examples</h1>

      {/* Basic Modal */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Basic Modal</h2>
        <p className="text-text-secondary">
          A simple modal with title and content. Click outside or press Escape to close.
        </p>
        <Button onClick={() => setBasicModalOpen(true)}>Open Basic Modal</Button>

        <Modal
          isOpen={basicModalOpen}
          onClose={() => setBasicModalOpen(false)}
          title="Basic Modal"
        >
          <div className="space-y-4">
            <p className="text-text-primary">
              This is a basic modal with a title and some content.
            </p>
            <p className="text-text-secondary">
              You can close this modal by:
            </p>
            <ul className="list-disc list-inside text-text-secondary space-y-1">
              <li>Clicking the X button</li>
              <li>Clicking outside the modal (backdrop)</li>
              <li>Pressing the Escape key</li>
            </ul>
          </div>
        </Modal>
      </section>

      {/* Modal with Footer */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Modal with Footer</h2>
        <p className="text-text-secondary">
          A modal with action buttons in the footer.
        </p>
        <Button onClick={() => setWithFooterModalOpen(true)}>Open Modal with Footer</Button>

        <Modal
          isOpen={withFooterModalOpen}
          onClose={() => setWithFooterModalOpen(false)}
          title="Confirm Action"
          footer={
            <>
              <Button variant="ghost" onClick={() => setWithFooterModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  alert('Action confirmed!');
                  setWithFooterModalOpen(false);
                }}
              >
                Confirm
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-text-primary">
              Are you sure you want to proceed with this action?
            </p>
            <p className="text-text-secondary">
              This action cannot be undone.
            </p>
          </div>
        </Modal>
      </section>

      {/* Large Modal */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Large Modal</h2>
        <p className="text-text-secondary">
          A larger modal for more content.
        </p>
        <Button onClick={() => setLargeModalOpen(true)}>Open Large Modal</Button>

        <Modal
          isOpen={largeModalOpen}
          onClose={() => setLargeModalOpen(false)}
          title="Large Modal"
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-text-primary">
              This is a large modal with more space for content.
            </p>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-text-primary">Features</h3>
              <ul className="list-disc list-inside text-text-secondary space-y-1">
                <li>Semi-transparent backdrop (rgba(0,0,0,0.5))</li>
                <li>Centered positioning (vertically and horizontally)</li>
                <li>Smooth slide-in animation (300ms)</li>
                <li>Multiple size options (sm, md, lg, xl, full)</li>
                <li>Keyboard navigation (Escape to close)</li>
                <li>Backdrop click to close</li>
                <li>Body scroll lock when open</li>
                <li>Full-screen on mobile for better usability</li>
              </ul>
            </div>
          </div>
        </Modal>
      </section>

      {/* Full-Screen Modal */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Full-Screen Modal</h2>
        <p className="text-text-secondary">
          A full-screen modal (especially on mobile).
        </p>
        <Button onClick={() => setFullModalOpen(true)}>Open Full-Screen Modal</Button>

        <Modal
          isOpen={fullModalOpen}
          onClose={() => setFullModalOpen(false)}
          title="Full-Screen Modal"
          size="full"
        >
          <div className="space-y-4">
            <p className="text-text-primary">
              This modal takes up the full screen on mobile devices for better usability.
            </p>
            <p className="text-text-secondary">
              On desktop, it has a maximum width with margins.
            </p>
          </div>
        </Modal>
      </section>

      {/* Modal without Backdrop Close */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">
          Modal without Backdrop Close
        </h2>
        <p className="text-text-secondary">
          A modal that can only be closed with the X button or Escape key.
        </p>
        <Button onClick={() => setNoBackdropCloseModalOpen(true)}>
          Open Modal (No Backdrop Close)
        </Button>

        <Modal
          isOpen={noBackdropCloseModalOpen}
          onClose={() => setNoBackdropCloseModalOpen(false)}
          title="Important Notice"
          closeOnBackdropClick={false}
        >
          <div className="space-y-4">
            <p className="text-text-primary">
              This modal cannot be closed by clicking outside.
            </p>
            <p className="text-text-secondary">
              You must use the X button or press Escape to close it.
            </p>
          </div>
        </Modal>
      </section>

      {/* Size Comparison */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Size Comparison</h2>
        <p className="text-text-secondary">
          Compare different modal sizes.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button size="sm" onClick={() => {
            const modal = document.createElement('div');
            modal.innerHTML = '<div>Small Modal</div>';
            document.body.appendChild(modal);
          }}>
            Small (sm)
          </Button>
          <Button size="sm" onClick={() => setBasicModalOpen(true)}>
            Medium (md) - Default
          </Button>
          <Button size="sm" onClick={() => setLargeModalOpen(true)}>
            Large (lg)
          </Button>
          <Button size="sm" onClick={() => {
            const modal = document.createElement('div');
            modal.innerHTML = '<div>Extra Large Modal</div>';
            document.body.appendChild(modal);
          }}>
            Extra Large (xl)
          </Button>
          <Button size="sm" onClick={() => setFullModalOpen(true)}>
            Full Screen (full)
          </Button>
        </div>
      </section>

      {/* Requirements Validation */}
      <section className="space-y-4 mt-12 p-6 bg-background-secondary rounded-lg border border-border-light">
        <h2 className="text-2xl font-semibold text-text-primary">Requirements Validation</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-success-DEFAULT">✓</span>
            <div>
              <p className="text-text-primary font-medium">Requirement 10.1: Semi-transparent backdrop</p>
              <p className="text-text-secondary text-sm">
                Backdrop uses rgba(0,0,0,0.5) - implemented as bg-black/50 in Tailwind
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-success-DEFAULT">✓</span>
            <div>
              <p className="text-text-primary font-medium">Requirement 10.2: Centered positioning</p>
              <p className="text-text-secondary text-sm">
                Modal is centered vertically and horizontally using flexbox (items-center justify-center)
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-success-DEFAULT">✓</span>
            <div>
              <p className="text-text-primary font-medium">Requirement 10.3: Smooth slide-in animation</p>
              <p className="text-text-secondary text-sm">
                Modal uses animate-slide-in-from-bottom with 300ms duration (defined in Tailwind config)
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ModalExamples;
