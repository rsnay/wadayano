import React from 'react';
import PropTypes from 'prop-types';

const Modal = ({ children, closeModal, modalState, title, showFooter, cardClassName }) => {
    if(!modalState) {
      return null;
    }
    
    return(
      <div className="modal is-active">
        <div className="modal-background" onClick={closeModal} />
        <div className={"modal-card " + cardClassName}>
          <header className="modal-card-head">
            <p className="modal-card-title">{title}</p>
            <button className="delete" onClick={closeModal} />
          </header>
          <section className="modal-card-body">
            <div className="content">
              {children}
            </div>
          </section>
          {showFooter && <footer className="modal-card-foot">
            <button className="button" onClick={closeModal}>Done</button>
          </footer>}
        </div>
      </div>
    );
}
  
Modal.propTypes = {
    closeModal: PropTypes.func.isRequired,
    modalState: PropTypes.bool.isRequired,
    title: PropTypes.string,
    showFooter: PropTypes.bool,
    cardClassName: PropTypes.string
}

export default Modal;