(function () {
    "use strict";

    angular
        .module("tracsDesktopApp")
        .controller("PatientsListController", PatientsListController);

    PatientsListController.$inject = ["$http", "$rootScope", "$log", "storage", "environment"];

    function PatientsListController($http, $rootScope, $log, storage, environment) {

        var vm = this,
            patientEndpoint = environment.api + "/patient",
            userId = storage.getUser()._id;

        vm.profiles = [];

        function activate() {
            $rootScope.pageTitle = "Mis pacientes";

            $http.get(patientEndpoint + "/user/" + userId).then(function (result) {
                vm.profiles = result.data;
            }, function (error) {
                $log.error("Ocurrió un error al recuperar los pacientes del usuario con id " + userId, error);
            });
        }

        activate();
    }

})();
