import React,{useReducer,useRef} from 'react'

import Form from '../../components/DynamicForm/Index'


import Validator from '../../validators';
import axios from "../../axios-orders"

import Translate from "../../components/Translate/Index";
import dynamic from 'next/dynamic'
const imageCompression = dynamic(() => import("browser-image-compression"), {
    ssr: false
});

const Verification = (props) => {
    const myRef = useRef(null)

    const [state, setState] = useReducer(
        (state, newState) => ({ ...state, ...newState }),
        {
            title: "Verification Request",
            success: false,
            error: null,
            loading: true,
            member: props.member,
            submitting: false,
            requestSend:props.member.verificationRequestSend ? props.member.verificationRequestSend : null
        }
    );
    const onSubmit = async model => {
        if (state.submitting) {
            return
        }
        setState({ submitting: true, error: null });
        let formData = new FormData();
        for (var key in model) {
            if(key == "image" && model[key] && typeof model[key] != "string"){
                var ext = model[key].name.substring(model[key].name.lastIndexOf('.') + 1).toLowerCase();
                const options = {
                  maxSizeMB: 1,
                  maxWidthOrHeight: 1200,
                  useWebWorker: true
                }
                let compressedFile = model[key]
                if(ext != 'gif' && ext != 'GIF'){
                    try {
                    compressedFile = await imageCompression(model[key], options);
                    } catch (error) { }
                }
                formData.append(key, compressedFile,model[key].name);
              }else if(model[key] != null && typeof model[key] != "undefined")
                formData.append(key, model[key]);
        }

        formData.append("user_id", state.member.user_id)

        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        };
        let url = '/members/verification';

        
        axios.post(url, formData, config)
            .then(response => {
                if (response.data.error) {
                    window.scrollTo(0, myRef.current.offsetTop);
                    setState({ error: response.data.error, submitting: false });
                } else {
                    setState({ submitting: false,requestSend:response.data.message });
                    props.openToast({message:Translate(props,response.data.message), type:"success"});
                }
            }).catch(err => {
                setState({ submitting: false, error: err });
            });
    };



        if(state.requestSend){
            return (
                <div className="alert alert-success verification-request" role="alert">
                    {props.t(state.requestSend)}
                </div>
            )
        }
        let validator = []
        validator.push({
            key: "image",
            validations: [
                {
                    "validator": Validator.required,
                    "message": "Image is required field"
                }
            ]
        },
        {
            key: "description",
            validations: [
                {
                    "validator": Validator.required,
                    "message": "Description is required field"
                } 
            ]
        })
        let formFields = []
       let content = Translate(props,"* Please upload a copy of your valid identification in PNG or JPEG format, no larger than 3mb in size.")+"<br>"+
       Translate(props,"* The image must be high quality, unobstructed and uncropped.")+"<br>"+
       Translate(props,"* The image must show a full document page or in case of national ID photocards, both sides of the card.")+"<br>";
        
        formFields.push(
            {
                key: "res_type_1",
                type: "content",
                content: '<h6 class="custom-control" style="padding-left:0px">' + content + '</h6>'
            },
            {removeAIBtn:true, key: "image", label: "Please select a recent picture of your passport or id", type: "file",isRequired:true },
            {removeAIBtn:true, key: "description", label: "Description", type: "textarea" ,isRequired:true}
        )

        let initalValues = {}
        initalValues["description"] = ""
        initalValues["image"] = ""
        return (
            <React.Fragment>
                <div ref={myRef}>
                <Form
                    editItem={state.member}
                    className="form"
                    {...props}
                    title={state.title}
                    initalValues={initalValues}
                    validators={validator}
                    submitText={!state.submitting ? "Submit Request" : "Submitting Request..."}
                    model={formFields}
                    generalError={state.error}
                    onSubmit={model => {
                        onSubmit(model);
                    }}
                />
                </div>
            </React.Fragment>
        )
    }


export default Verification