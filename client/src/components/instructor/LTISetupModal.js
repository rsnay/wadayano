import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Modal from '../shared/Modal';
import CopyableTextInput from '../shared/CopyableTextInput';
import { LTI_LAUNCH_URL } from '../../constants';

const LMS = {
    CANVAS: {
        id: 'CANVAS',
        displayName: 'Canvas',
        hint: (<p>First, set up wadayano as an external tool in Canvas using the “Canvas External Tool URL” and the key and secret from below. The “Privacy” setting must be set to <b>Public</b>. When creating an assignment, select the external wadayano tool that you've configured, and change the launch URL to the one below.
            <br />
            <a 
            target="_blank"
            rel="noopener noreferrer"
            href="https://guides.instructure.com/m/4152/l/57103-how-do-i-manually-configure-an-external-app-for-a-course" 
            className="button is-text">
                <span className="icon is-small"><i className="fas fa-question-circle"></i></span>
                <span>Help with Canvas integration</span></a>
            <br /> <br /> <CopyableTextInput readOnly label="Canvas External Tool URL" value={LTI_LAUNCH_URL} /></p>)
    },
    LEARNING_SUITE: {
        id: 'LEARNING_SUITE',
        displayName: 'Learning Suite',
        hint: (<p>When creating the assignment, select “Launch URL Configuration” and provide the following details.
            <br />
            <a 
            target="_blank"
            rel="noopener noreferrer"
            href="https://lsinfo.byu.edu/create-lti-learning-module-assignment" 
            className="button is-text">
                <span className="icon is-small"><i className="fas fa-question-circle"></i></span>
                <span>Help with Learning Suite integration</span></a>
        </p>)
    }
}

class LTISetupModal extends Component {

    constructor(props) {
        super(props);
        this.state = {
            lmsId: LMS.LEARNING_SUITE.id
        }
    }

    _formatUrl(lmsId, action, objectId) {
        switch(lmsId) {
            case LMS.CANVAS.id:
                return `${LTI_LAUNCH_URL}?action=${action}&objectId=${objectId}`;
            case LMS.LEARNING_SUITE.id:
            default:
                return `${LTI_LAUNCH_URL}/${action}/${objectId}`;
        }
    }

    render() {
        if (!this.props.modalState) {
            return null;
        }

        const lmsSelector = (
            <label className="label is-medium">
                Select your LMS<br />
                <div className="select">
                    <select value={this.state.lmsId} onChange={(e) => this.setState({lmsId: e.target.value})}>
                        <option value={LMS.LEARNING_SUITE.id}>Learning Suite</option>
                        <option value={LMS.CANVAS.id}>Canvas</option>
                    </select>
                </div>
            </label>
        );

        const launchUrl = this._formatUrl(this.state.lmsId, this.props.action, this.props.objectId);

        return (
            <Modal
            modalState={true}
            closeModal={this.props.closeModal}
            showFooter
            title={this.props.title || "Add to Learning Management System"}>
                {lmsSelector}
                {LMS[this.state.lmsId].hint}
                <CopyableTextInput readOnly label="Launch URL" value={launchUrl} />
                <br />
                <CopyableTextInput readOnly label="Consumer Key" value={this.props.consumerKey} />
                <br />
                <CopyableTextInput readOnly label="Shared Secret" value={this.props.sharedSecret} />
            </Modal>
        );
    }
}

LTISetupModal.propTypes = {
    action: PropTypes.string.isRequired,
    objectId: PropTypes.string.isRequired,
    consumerKey: PropTypes.string.isRequired,
    sharedSecret: PropTypes.string.isRequired,
    closeModal: PropTypes.func.isRequired,
    modalState: PropTypes.bool.isRequired,
    title: PropTypes.string,
    showFooter: PropTypes.bool
};

export default LTISetupModal;
