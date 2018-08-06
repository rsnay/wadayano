import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Modal from '../shared/Modal';
import CopyableTextInput from '../shared/CopyableTextInput';

class LTISetupModal extends Component {
    render() {
        if (!this.props.modalState) {
            return null;
        }
        return (
            <Modal
            modalState={true}
            closeModal={this.props.closeModal}
            showFooter
            title={this.props.title || "Add to Learning Management System"}>
                <p>Add this quiz to a learning management system that supports LTI tools. When creating the assignment, select “Launch URL Configuration” and provide the following details:</p>
                <CopyableTextInput readOnly label="Launch URL" value={this.props.launchUrl} />
                <br />
                <CopyableTextInput readOnly label="Consumer Key" value={this.props.consumerKey} />
                <br />
                <CopyableTextInput readOnly label="Shared Secret" value={this.props.sharedSecret} />
                <br />
                <a 
                target="_blank"
                rel="noopener noreferrer"
                href="https://lsinfo.byu.edu/create-lti-learning-module-assignment" 
                className="button is-text">
                    <span className="icon is-small"><i className="fas fa-question-circle"></i></span>
                    <span>Help with Learning Suite integration</span></a>
            </Modal>
        );
    }
}

LTISetupModal.propTypes = {
    launchUrl: PropTypes.string.isRequired,
    consumerKey: PropTypes.string.isRequired,
    sharedSecret: PropTypes.string.isRequired,
    closeModal: PropTypes.func.isRequired,
    modalState: PropTypes.bool.isRequired,
    title: PropTypes.string,
    showFooter: PropTypes.bool
};

export default LTISetupModal;