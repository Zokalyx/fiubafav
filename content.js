
// Una materia tiene esta estructura en el navbar:
//
// <li>
//   <a data-key={id} data-parent-key="mycourses" ...>
// 
//     <div>
//       <div class="media">
//         <span class="media-left"> <!-- ícono --> </span>
//         <span class="media-body">     {texto}    </span>
//       </div>
//     </div>
//
//     <!-- elementos adicionales añadidos por la extensión -->
//     <div class="custom">
//       <i class="custom-favorite" ...>
//       <i class="custom-options" ...>
//     </div>
// 
//   </a>
// </li>

class FiubaFavStorage {
    constructor(storageName) {
        this.storageName = storageName;
    }

    getAllSubjects() {
        return JSON.parse(localStorage.getItem(this.storageName)) || {};
    }

    getSubject(id) {
        let subjects = this.getAllSubjects();

        if (subjects.hasOwnProperty(id)) {
            return subjects[id];
        } else {
            return null;
        }
    }

    updateSubjects(subjects) {
        localStorage.setItem(this.storageName, JSON.stringify(subjects));
    }

    saveSubject(id, favorite, name) {
        let subjects = this.getAllSubjects();
        subjects[id] = { favorite: favorite, name: name };
        this.updateSubjects(subjects);
    }

    updateSubjectFavorite(id, favorite) {
        let subjects = this.getAllSubjects();
        if (subjects.hasOwnProperty(id)) {
            subjects[id].favorite = favorite;
        } else {
            // No debería ocurrir esto, pero hay un valor default por las dudas
            subjects[id] = { favorite: favorite, name: "Materia sin nombre" };
        }
        this.updateSubjects(subjects);
    }

    updateSubjectName(id, name) {
        let subjects = this.getAllSubjects();
        if (subjects.hasOwnProperty(id)) {
            subjects[id].name = name;
        } else {
            // No debería ocurrir esto, pero hay un valor default por las dudas
            subjects[id] = { favorite: false, name: name };
        }
        this.updateSubjects(subjects);
    }

    deleteSubject(id) {
        let subjects = this.getAllSubjects();
        delete subjects[id];
        this.updateSubjects(subjects);
    }
}

class Subject {
    constructor(element, storage, args = undefined) {
        this.element = element;
        this.attachExtraIcons();
        this.storage = storage;

        // Usar args cuando se crea una materia "de cero"
        if (args?.id !== undefined) {
            this.setId(args.id);
        }

        if (args?.deletable !== undefined) {
            this.setDeletable(args.deletable);
        }

        let subjectData = storage.getSubject(this.getId());
        if (subjectData !== null) {
            this.setFavorite(subjectData.favorite);
            this.setText(subjectData.name);
        } else {
            if (args?.name !== undefined) {
                this.setText(args.name);
            }
        }

        this.save();
        this.updateURL();
        this.attachIconCallbacks();
    }

    attachExtraIcons() {
        let container = document.createElement("div");
        container.className = "custom";

        // Delete button (default: not deletable)
        let deleteIcon = document.createElement("i");
        deleteIcon.className = "icon fa fa-trash fa-fw custom-not-deletable";
        container.appendChild(deleteIcon);

        // Options button
        let optionIcon = document.createElement("i");
        optionIcon.className = "icon fa fa-cog fa-fw custom-options";
        container.appendChild(optionIcon);

        // Favorite button (default: not favorite)
        let favIcon = document.createElement("i");
        favIcon.className = "icon fa fa-star fa-fw custom-not-favorite";
        container.appendChild(favIcon);

        this.element.appendChild(container);
    }

    attachIconCallbacks() {
        const optionsIcon = this.getIcon("options");
        optionsIcon.addEventListener("click", (event) => {
            event.preventDefault();
            const newName = prompt("Nombre de la materia:");
            if (newName !== null) {
                this.setText(newName);
            }
        });

        const favoriteIcon = this.getIcon("favorite");
        favoriteIcon.addEventListener("click", (event) => {
            event.preventDefault();
            this.setFavorite(!this.isFavorite());
        });

        if (this.isDeletable()) {
            const deleteIcon = this.getIcon("delete");
            deleteIcon.addEventListener("click", (event) => {
                event.preventDefault();
                const confirmation = confirm(`Querés eliminar la materia ${this.getText()}?`);
                if (!confirmation) {
                    return;
                }

                this.storage.deleteSubject(this.getId());

                this.element.dispatchEvent(new CustomEvent("delete", {
                    detail: {
                        id: this.getId()
                    },
                    target: this.element
                }));
            });
        }
    }

    save() {
        this.storage.saveSubject(this.getId(), this.isFavorite(), this.getText());
    }

    getIcon(icon) {
        switch (icon) {
            case "options":
                return this.element.querySelector(".custom-options");
                break;
            case "favorite":
                return this.element.querySelector(".custom-favorite") || this.element.querySelector(".custom-not-favorite");
                break;
            case "delete":
                return this.element.querySelector(".custom-deletable") || this.element.querySelector(".custom-not-deletable");
                break;
            default:
                return null;
        }
    }

    setDeletable(deletable) {
        const icon = this.getIcon("delete");
        if (deletable) {
            icon.classList.remove("custom-not-deletable");
            icon.classList.add("custom-deletable");
        } else {
            icon.classList.remove("custom-deletable");
            icon.classList.add("custom-not-deletable");
        }
    }

    isDeletable() {
        const icon = this.getIcon("delete");
        return icon.classList.contains("custom-deletable");
    }

    setFavorite(favorite) {
        const icon = this.getIcon("favorite");
        if (favorite) {
            icon.classList.remove("custom-not-favorite");
            icon.classList.add("custom-favorite");
        } else {
            icon.classList.remove("custom-favorite");
            icon.classList.add("custom-not-favorite");
        }
        this.save();
    }

    isFavorite() {
        const icon = this.getIcon("favorite");
        return icon.classList.contains("custom-favorite");
    }

    getText() {
        return this.element.querySelector("span.media-body").innerText;
    }

    setText(text) {
        this.element.querySelector("span.media-body").innerText = text;
        this.save();
    }

    getId() {
        return Number(this.element.getAttribute("data-key"));
    }

    setId(id) {
        this.element.setAttribute("data-key", id);
    }

    updateURL() {
        this.element.setAttribute("href", `https://campusgrado.fi.uba.ar/course/view.php?id=${this.getId()}`);
    }
}

class SubjectList {
    constructor(storage) {
        this.storage = storage;
        this.subjects = {};

        // Hay que hacer esto porque hay dos navbars cuando estás en
        // un aula virtual, y ambas tienen la clase list-group
        // Queremos la última nada más, donde están las materias
        let lists = document.querySelectorAll('nav.list-group ul');
        this.element = lists[lists.length - 1];

        this.createTemplateElement();
        this.createSubjectsFromExistingList();
        this.createExtraSubjects();
        this.createAddSubjectButton();
    }

    // Envuelve el elemento en un <li> y lo añade a la lista
    appendElementLast(element) {
        let listElement = document.createElement("li");
        listElement.appendChild(element);
        this.element.appendChild(listElement);
    }

    insertElementSecondToLast(element) {
        let listElement = document.createElement("li");
        listElement.appendChild(element);

        const lastItem = this.element.lastElementChild;
        this.element.insertBefore(listElement, lastItem);
    }

    createSubjectsFromExistingList() {
        const subjectElements = this.element.querySelectorAll('a[data-parent-key="mycourses"]');

        subjectElements.forEach((element) => {
            const newSubject = new Subject(element, this.storage);
            this.subjects[newSubject.getId()] = newSubject;
            element.addEventListener("delete", this.onSubjectDelete);

            this.appendElementLast(element);
        });
    }

    // Goes over saved subjects and adds any that are not given in the HTML
    createExtraSubjects() {
        const subjects = this.storage.getAllSubjects();

        Object.keys(subjects).forEach((id) => {
            if (id in this.subjects) {
                return;
            }

            let newSubjectElement = this.templateElement.cloneNode(true);
            let { favorite, name } = subjects[id];

            this.subjects[id] = new Subject(newSubjectElement, this.storage, { id: id, favorite: favorite, name: name, deletable: true });
            newSubjectElement.addEventListener("delete", this.onSubjectDelete);

            this.appendElementLast(newSubjectElement);
        });
    }

    // Duplicates the last subject and removes unwanted properties
    createTemplateElement() {
        let element = this.element.lastElementChild.firstElementChild.cloneNode(true);

        element.removeAttribute("href");
        element.removeAttribute("data-key");

        // Por si justo clonamos la materia seleccionada
        element.setAttribute("data-isactive", 0);
        element.setAttribute("data-forceopen", 0);
        element.classList.remove("active");
        element.classList.remove("active_tree_node");
        element.querySelector("span.media-body").classList.remove("font-weight-bold");

        element.querySelector("span.media-body").textContent = "";

        this.templateElement = element;
    }


    createAddSubjectButton() {
        let addSubjectButton = this.templateElement.cloneNode(true);

        addSubjectButton.setAttribute("data-parent-key", "home");  // para que no "cuente" como una materia más

        addSubjectButton.querySelector("span.media-body").textContent = "Agregar materia";
        addSubjectButton.querySelector("span.media-left").classList.add("custom-hidden"); // ocultar sombrerito

        addSubjectButton.addEventListener("click", (event) => {
            event.preventDefault();

            let userInput = prompt("Ingresá el ID de la materia (el número que aparece en el link del aula virtual, no lo confundas con el código de la materia)");
            if (userInput === null) {
                return;
            }

            const id = parseInt(userInput);
            if (isNaN(id)) {
                alert("Número inválido, probá de nuevo");
                return;
            }
            let name = prompt("Ingresá el nombre de la materia");

            let subjectElement = this.templateElement.cloneNode(true);
            this.subjects[id] = (new Subject(subjectElement, this.storage, { id: id, name: name, deletable: true }));
            subjectElement.addEventListener("delete", this.onSubjectDelete);

            // Anteúltimo porque acá ya existe el botón de agregar materias
            this.insertElementSecondToLast(subjectElement);
        });

        this.appendElementLast(addSubjectButton);
    }

    // Hay que preservar el contexto del closure para poder usar this
    onSubjectDelete = (event) => {
        const id = event.detail.id;
        delete this.subjects[id];

        event.target.parentNode.remove();
    }
}

// Main

const storage = new FiubaFavStorage("fiubafav");
const list = new SubjectList(storage);
