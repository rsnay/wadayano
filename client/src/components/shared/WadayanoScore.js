import React, { Component } from 'react';
import { formatScore } from '../../utils';
import Logo from '../../logo_boxed.svg';
import Modal from '../shared/Modal';

const emojis = {
    "Accurate" : "🧘",
    "Mixed" : "🤷‍",
    "Overconfident" : "🤦‍",
    "Underconfident" : "🙍‍"
}

export default class WadayanoScore extends Component{

    constructor(props) {
        super(props);
    
        this.state = {
            displayHelpText:false,
        };
    
        // Pre-bind this function, to make adding it to input fields easier
        this.helpText = this.helpText.bind(this);
    }

    helpText(){
        this.setState({displayHelpText: true});
    }
    
    render(){
    return(<React.Fragment><div className="columns is-gapless is-multiline" style={{margin:"0px"}}>
        <div className = "column is-2" style={{width:"80px", margin:"5px"}}><img className="wadayano-score-logo" src={Logo} alt="wadayano" style={{maxHeight: "4rem", height: "4rem", margin: "0px"}} /></div>
        <div className="column"><h2 className="subtitle is-4" style={{margin:"0px"}}>Wadayano Score: {formatScore(this.props.score)}</h2>
        <div><span className="subtitle is-4">{emojis[this.props.confidenceText]} {this.props.confidenceText}</span><span className="question-mark-circle" onClick = {() => this.helpText()}>?</span></div></div>
        </div>

        <Modal
            modalState={this.state.displayHelpText}
            closeModal={() => this.setState({ displayHelpText: false })}
            title={"Help:"}>
            <p>Wadayano Score measures how well you know what you know.</p>

            <p>-Higher scores mean you are only confident about things you actually know.</p>

            <p>-Lower scores may indicate that you are over- or under-confident.</p>
        </Modal></React.Fragment>
        );
    }
}