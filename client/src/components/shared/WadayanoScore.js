
import React, { Component } from 'react';

import { formatScore } from '../../utils';

import Logo from '../../logo_boxed.svg';


const emojis = {
    "Accurate" : "🧘",
    "Mixed" : "🤷‍",
    "Overconfident" : "🤦‍",
    "Underconfident" : "🙍‍"
}

export default class WadayanoScore extends Component{    
    render(){
    return(<div className="columns is-gapless is-multiline" style={{margin:"0px"}}>
        <div className = "column is-2" style={{width:"80px", margin:"5px"}}><img className="wadayano-list" src={Logo} alt="wadayano" style={{maxHeight: "4rem", height: "4rem", margin: "0px"}} /></div>
        <div className="column"><h2 className="subtitle is-4" style={{margin:"0px"}}>wadayano score&#8482;: {this.props.wadayano}%</h2>
        <div><span className="subtitle is-4">{emojis[this.props.confidenceText]} {this.props.confidenceText}</span> <i class="fas fa-question-circle" aria-hidden="true"></i></div></div>
        </div>);
    }
}