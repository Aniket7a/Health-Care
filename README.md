## 🔗 Integrated Sub-Modules

Our project **Ayuvaani** is designed as a modular healthcare system.  
Certain core features are maintained in **separate repositories** and are integrated into the main project.

### 📌 1. Jeevan Rakshak SOS System  
- GitHub: [SOS-System](https://github.com/sharan-sharma-01/SOS-system)  
- **Description**: Emergency SOS module that allows users to instantly share live location, notify emergency contacts, and trigger quick help.  
- **Deployment**: This is deployed as an independent service and consumed by the main Ayuvaani platform.

---

### 📌 2. AI/ML Healthcare Model  
- GitHub: [Healthcare AI Model](https://github.com/arsingla786/healthCareModel)  
- **Description**: Machine Learning model for health symptom analysis, prediction, and recommendations.  
- **Deployment**: Packaged and deployed separately, accessed via APIs within Ayuvaani.

---

⚠️ **Note**: Both modules are maintained as **standalone microservices** in their respective repositories.  
The **main Ayuvaani project** integrates them through APIs and links, ensuring modular development and easier scaling.
