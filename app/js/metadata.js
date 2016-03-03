var metadata = angular.module("metadata", [])

        .controller("MetadataController", ["$scope", '$location', '$window', 'FilterParameters', 'difMetadata',
            function ($scope, $location, $window, FilterParameters, difMetadata) {

                $scope.hasDif = function () {
                    return $scope.hasMetadata() && difMetadata.data.dif[0].length > 0;
                };

                $scope.hasMetadata = function () {
                    return typeof difMetadata.data != 'undefined'
                };

                $scope.hasGSNMetadata = function () {
                    return $scope.hasMetadata() && difMetadata.data.gsn[0].indexOf("sensorName") > -1;
                };

                $scope.hasWikiLink = function () {
                    return $scope.gsnMetadata.features[0].properties.wikiLink != undefined;
                };


                if ($scope.hasDif()) {
                    $scope.dif = JSON.parse(difMetadata.data.dif);
                }

                if ($scope.hasGSNMetadata()) {
                    $scope.gsnMetadata = JSON.parse(difMetadata.data.gsn);
                }

                if (!$scope.hasDif() && !$scope.hasGSNMetadata()) {
                    $scope.errorMessage = difMetadata;
                }

                $scope.getCoordinates = function () {

                    if ($scope.dif) {
                        return [$scope.dif.DIF.Spatial_Coverage.Southernmost_Latitude,
                            $scope.dif.DIF.Spatial_Coverage.Westernmost_Longitude];

                    } else if ($scope.gsnMetadata) {
                        return [$scope.gsnMetadata.features[0].geometry.coordinates[1],
                            $scope.gsnMetadata.features[0].geometry.coordinates[0]];
                    }
                    return [];
                };

                $scope.coordinates = $scope.getCoordinates();

                var getIcon = function () {

                    if ( $scope.gsnMetadata && $scope.gsnMetadata.features[0].properties.isPublic === true) {
                        return {
                            iconUrl: 'img/green_.png',
                            iconSize: [28, 28],
                            iconAnchor: [12, 0]
                        }
                    }
                    return {
                        iconUrl: 'img/red_.png',
                        iconSize: [28, 28],
                        iconAnchor: [12, 0]
                    }

                };
                if ($scope.coordinates.length == 2) {
                    angular.extend($scope, {

                        layers: {
                            baselayers: {
                                googleTerrain: {
                                    name: 'Google Terrain',
                                    layerType: 'TERRAIN',
                                    type: 'google'
                                },
                                googleHybrid: {
                                    name: 'Google Hybrid',
                                    layerType: 'HYBRID',
                                    type: 'google'
                                },
                                googleRoadmap: {
                                    name: 'Google Streets',
                                    layerType: 'ROADMAP',
                                    type: 'google'
                                }
                            }
                        },
                        center: {
                            lat: $scope.coordinates[0],
                            lng: $scope.coordinates[1],
                            zoom: 8
                        },
                        markers: {
                            sensor: {
                                lat: $scope.coordinates[0],
                                lng: $scope.coordinates[1],
                                focus: true,
                                draggable: false,
                                icon: getIcon()
                            }
                        }

                    });
                }

                $scope.download = function () {
                    if (ftpLink.length > 0) {
                        $window.location.href = ftpLink;
                    } else {
                        var url = "http://montblanc.slf.ch:22001/multidata?download_format=csv&field[0]=All&vs[0]="
                            + $scope.gsnMetadata.features[0].properties.sensorName;
                        $window.location.href = url;
                    }
                };

                $scope.explore = function () {
                    console.log('PLOT ' + $scope.gsnMetadata.features[0].properties.sensorName);
                    FilterParameters.reset();
                    FilterParameters.sensors = [$scope.gsnMetadata.features[0].properties.sensorName];
                    //FilterParameters.fields = getParametersForLink(feature)
                    FilterParameters.resetPromise();
                    $location.path('/plot')
                    FilterParameters.updateURLFromMap($location);

                };

                function getFTPLink() {
                    if ($scope.hasDif()) {
                        var urls = $scope.dif.DIF.Related_URL;
                        for (var i = 0; i < urls.length; i++) {
                            var url = urls[i];
                            if (url.URL.indexOf('ftp') > -1) {
                                return url.URL;
                            }
                        }
                    }
                    return "";
                }

                var ftpLink = getFTPLink();

                $scope.buildReferences = function () {
                    if ($scope.dif.DIF.Reference) {
                        if (Object.prototype.toString.call($scope.dif.DIF.Reference) != '[object Array]') {
                            $scope.dif.DIF.Reference = [$scope.dif.DIF.Reference];
                        }


                    }
                    return  $scope.dif.DIF.Reference;

                };

                $scope.referenceHasValue = function(reference, value) {
                    return (typeof reference[value] !== 'undefined' && reference[value].length >0);
                };

            }])


        .factory('DifMetadataLoad', ['$http', '$q', '$route', 'FilterParameters',
            function ($http, $q, $route, FilterParameters) {

                this.promise;

                var self = this;
                var sdo = {
                    getData: function () {

                        //if (!self.promise) {
                        var sensorName = $route.current.params.sensor;

                        if (sensorName == null) {
                            if (FilterParameters.sensors.length > 0) {
                                sensorName = FilterParameters.sensors[0];
                            } else {
                                return "Please specify sensor name in URL! For example: metadata?sensor=wfj_vf_meteo";
                            }
                        }

                        var url = 'http://montblanc.slf.ch:8090/web/metadatadif/' + sensorName;
                        //var url = 'http://localhost:8090/web/metadatadif/' + sensorName;

                        self.promise = $http({
                            method: 'GET',
                            url: url
                        });
                        self.promise.then(function (data) {
                            return data.response;
                        }, function (data) {
                            console.log('ERROR ' + data.statusText);
                            return 'Error when loading metadata';
                        });
                        //}
                        return self.promise;
                    }
                };
                return sdo;
            }])

        .factory('DifMetadata', function () {
            function DifMetadata(metadata) {
                this.metadata = metadata;
            }

            DifMetadata.prototype = {


                getProperties: function () {
                    return this.metadata.features[0].properties['allProperties'];
                },

                getSensorName: function () {
                    return this.metadata.features[0].properties.sensorName;
                },

                getFromDate: function () {
                    //return new Date('2001-01-01');
                    return this.metadata.features[0].properties['fromDate'];
                },

                getToDate: function () {
                    //return new Date('2016-01-01');
                    return this.metadata.features[0].properties['untilDate'];
                }


            }

            return DifMetadata;
        })
    ;
