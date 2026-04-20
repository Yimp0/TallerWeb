const tabla= document.getElementById("tablaMateriales").getElementsByTagName("tbody")[0];
window.onload=function(){
    const datosGuardados = localStorage.getItem("tablaEditable");
    if(datosGuardados){
        tabla.innerHTML = datosGuardados;
    }
}

function guardarCambios(){
    localStorage.setItem("tablaEditable", tabla.innerHTML);
    alert("¡Cambios guardados correctamente!");
}