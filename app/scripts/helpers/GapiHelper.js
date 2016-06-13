/* jshint bitwise: false, camelcase: false, curly: true, eqeqeq: true, globals: false, freeze: true, immed: true, nocomma: true, newcap: true, noempty: true, nonbsp: true, nonew: true, quotmark: true, undef: true, unused: true, strict: true, latedef: nofunc */

/* globals angular, gapi */

/**
 * @ngdoc function
 * @name TracsClient:storage
 * @description
 * Factory para manejar la gapi de Google, tanto
 * de autorización como de invocación de métodos
 */

(function () {
    "use strict";

    angular
        .module("tracsDesktopApp")
        .factory("GapiHelper", GapiHelper);

    GapiHelper.$inject = ["$q", "localStorageService", "environment"];

    function GapiHelper($q, localStorageService, environment) {

        // Setea en el localStorage el nombre de la carpeta
        // donde se guardarán los reportes del usuario
        var TRACS_FOLDER_KEY = "tracs_folder";
        localStorageService.set(TRACS_FOLDER_KEY, "TRACS - reportes");

        var isGapiClientLoaded = false,
            isGapiCallAuthorized = false,
            clientId = environment.clientId,
            scopes = [
                "https://www.googleapis.com/auth/drive.metadata.readonly"
            ];

        function getTracsFolderName() {
            return localStorageService.get(TRACS_FOLDER_KEY);
        }

        /**
         * Carga la librería con el cliente de la API de Drive
         * @returns {promise} una promesa cuando se terminó de cargar
         */
        function loadDriveApi() {
            return gapi.client.load("drive", "v3").then(function () {
                isGapiClientLoaded = true;
                return true;
            });
        }

        /**
         * Autoriza una llamada a la API
         * @returns {promise} una promesa cuando se autorizó correctamente
         */
        function authorizeApiCall() {
            return $q(function (resolve, reject) {
                gapi.auth.authorize({
                    "client_id": clientId,
                    "scope": scopes.join(" "),
                    "immediate": true
                }, function (authResult) {
                    if (authResult && !authResult.error) {
                        isGapiCallAuthorized = true;
                        resolve(authResult);
                    } else {
                        reject("Authorization error");
                    }
                });
            });
        }

        /**
         * Verifica si el usuario ya dio permisos
         * para ejecutar la acción, y autoriza la llamada
         */
        function verifyAuthorization() {
            return $q(function (resolve) {
                // Si la Gapi no está cargada las llamadas tampoco están autorizadas, hacer ambas
                if (!isGapiClientLoaded) {
                    loadDriveApi().then(function () {
                        authorizeApiCall().then(function () {
                            resolve(true);
                        });
                    });
                } else {
                    resolve(true);
                }
            });
        }

        /**
         * Crea una carpeta en el drive de la persona logueada
         * @param   {string}  folderName el nombre de la nueva carpeta
         * @returns {promise} una promesa con el resultado de la creación
         */
        function createDriveFolder(folderName) {
            return $q(function (resolve) {
                verifyAuthorization().then(function () {

                    var fileMetadata = {
                        "name": folderName,
                        "mimeType": "application/vnd.google-apps.folder"
                    };

                    var request = gapi.client.drive.files.create({
                        "resource": fileMetadata,
                        "fields": "id"
                    });

                    request.execute(function (file) {
                        resolve(file);
                    });
                });
            });
        }

        /**
         * Verifica si el usuario logueado tiene una carpeta
         * creada con el nombre pasado por parámetro
         * @param   {string}  folderName el nombre de la carpeta
         * @returns {promise} una promesa con las carpetas y result
         */
        function isFolderCreated(folderName) {
            return $q(function (resolve) {
                verifyAuthorization().then(function () {
                    var query = "name='" + folderName + "'and trashed=false",
                        requestParentId = gapi.client.drive.files.list({
                            pageSize: 10,
                            q: query,
                            fields: "nextPageToken, files(id, name, parents)"
                        });

                    requestParentId.execute(function (resp) {
                        var responseObject = {
                            created: false,
                            files: resp.files
                        };

                        if (resp.files.length > 0) {
                            responseObject.created = true;
                        }

                        resolve(responseObject);
                    });
                });
            });
        }

        /**
         * Recupera los documentos de una carpeta
         * @param {string} folderId el id de la carpeta
         * @returns {promise} una promesa con el arreglo de documentos
         */
        function getFolderFiles(folderId) {
            return $q(function (resolve) {
                verifyAuthorization().then(function () {
                    var query = "'" + folderId + "'" + " in parents and trashed=false",
                        requestFolderFiles = gapi.client.drive.files.list({
                            pageSize: 10,
                            q: query,
                            fields: "nextPageToken, files(id, name, createdTime, modifiedTime, lastModifyingUser, owners)"
                        });

                    requestFolderFiles.execute(function (resp) {
                        resolve(resp);
                    });
                });
            });
        }

        var service = {
            getTracsFolderName: getTracsFolderName,
            createDriveFolder: createDriveFolder,
            isFolderCreated: isFolderCreated,
            getFolderFiles: getFolderFiles
        };

        return service;
    }

})();