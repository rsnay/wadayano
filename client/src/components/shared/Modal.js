import React from 'react';
import PropTypes from 'prop-types';
import AriaModal from 'react-aria-modal';

const Modal = ({ children, closeModal, modalState, title, showFooter, cardClassName }) => {
  if (!modalState) {
    return null;
  }

  return (
    <AriaModal
      titleText={title}
      onExit={closeModal}
      verticallyCenter
      underlayClickExits={false}
      underlayColor="transparent"
      underlayStyle={{ paddingTop: '2em' }}
    >
      <div className="modal is-active">
        <div className="modal-background" onClick={closeModal} />
        <div className={`modal-card ${cardClassName}`}>
          <header className="modal-card-head">
            <p className="modal-card-title">{title}</p>
            <button className="delete" onClick={closeModal} type="button" />
          </header>
          <section className="modal-card-body">
            <div className="content">{children}</div>
          </section>
          {showFooter && (
            <footer className="modal-card-foot">
              <button className="button" onClick={closeModal} type="button">
                Done
              </button>
            </footer>
          )}
        </div>
      </div>
    </AriaModal>
  );
};

Modal.propTypes = {
  closeModal: PropTypes.func.isRequired,
  modalState: PropTypes.bool.isRequired,
  title: PropTypes.string,
  showFooter: PropTypes.bool,
  cardClassName: PropTypes.string,
};

export default Modal;
