(function() {
  'use strict';
  var CHARTWIDTH = 1000;
  var CHARTHEIGHT = 360;
  var ID = 'TODOid';
  var NAME = 'TODOchart';

  function Actor(name, id, group) {
    this.name = name;
    this.id = id;
    this.group = group;
    this.groupPtr = null;
    this.firstScene = null;
    this.groupPositions = {};
    this.groupNamePositions = {};
  }

  function PunchcardController(d3, dc, crossfilter, colorbrewer) {
    var textRenderlet = function(_chart) {
      function setStyle(selection) {
        var rects = selection.select('rect');
        var texts = selection.select('text');

        var colors = [];
        rects.each( function(){
          colors.push(d3.select(this).attr('fill'));
        });

        texts.each( function(d, i){
          d3.select(this).style('fill', function() {
            return 'black';
          });
        });
      }
      // set the fill attribute for the bars
      setStyle(_chart
        .selectAll('g.row'), 'layer'
      );
    };

    function readData(filename) {
      var margin = {
        top: 20,
        right: 25,
        bottom: 20,
        left: 1
      };
      // var width = CHARTWIDTH - margin.left - margin.right;
      // var height = CHARTHEIGHT - margin.top - margin.bottom;


      d3.json(filename,
        // callback function
        function(error, data) {
          if (error) {
            console.log(error);
          }

          var actors = data.timeline.actors;
          var events = data.timeline.events;

          var ndx = crossfilter(events);
          var all = ndx.groupAll();

          var timeDimension = ndx.dimension(function(d) {
            var group = d.group.split(':')[0];
            var time = d3.time.format('%Y%m%d').parse(d.time);
            var climax = d.climax;
            return [group, time, climax];
          });

          var maxDate = new Date(-8640000000000000);
          var minDate = new Date(8640000000000000);

          timeDimension.top(Infinity).forEach(function(d) {
            var time = d3.time.format('%Y%m%d').parse(d.time);
            if (time < minDate) {
              minDate = time;
            }
            if (time > maxDate) {
              maxDate = time;
            }
          });

          var climaxSumGroup = timeDimension.group().reduceSum(function(d) {
            return +d.climax;
          });

          var symbolScale = d3.scale.ordinal().range(d3.svg.symbolTypes);

          var subChart1 = function(c) {
            return dc.scatterPlot(c)
              .symbol(function(d) {
                return symbolScale(d.key[0]);
              })
              .symbolSize(8)
              .highlightedSize(10);
          };

          var customSeriesChart = dc.customSeriesChart('#timeline');

          customSeriesChart
            .width(1400)
            .height(200)
            // .chart(subChart1)
            .chart(subChart1)
            .x(d3.time.scale())//.domain([new Date(1995, 0, 1), new Date(2025, 0, 1)]))
            .renderHorizontalGridLines(true)
            .seriesAccessor(function(d) {
              return d.key[0];
            })
            .keyAccessor(function(d) {
              return d.key[1];
            })
            .valueAccessor(function(d) {
              return d.value;
            })
            .filterHandler(function(dimension, filter){
              if (filter.length ===0) {
                dimension.top(Infinity).forEach(function(d) {
                  var time = d3.time.format('%Y%m%d').parse(d.time);
                  if (time < minDate) {
                    minDate = time;
                  }
                  if (time > maxDate) {
                    maxDate = time;
                  }
                });
              }
              dimension.filterFunction(function(d) {
                var result = true;

                filter.forEach(function(f) {
                  if (result === true) {
                    if ((d[1] < Math.min(f[0][0], f[1][0]) || d[1] > Math.max(f[0][0], f[1][0])) ||
                        (d[2] < Math.min(f[0][1], f[1][1]) || d[2] > Math.max(f[0][1], f[1][1]))) {
                      result = false;
                    }
                  }
                  minDate = f[0][0];
                  maxDate = f[1][0];
                });
                return result;
              });
              // dimension.filter(filter);
              return filter; // set the actual filter value to the new value
            })
            // .keyAccessor(function(d) {return d.key; })
            // .valueAccessor(function(d) {return d.value; })
            .elasticX(true)
            .elasticY(true)
            .brushOn(true)
            .clipPadding(10)
            .xAxisLabel('time')
            .yAxisLabel('climax score sum')
            .dimension(timeDimension)
            .group(climaxSumGroup);
          customSeriesChart.render();




          var customBubbleChart = dc.customBubbleChart('#laneChart');

          var laneTimeDimension = ndx.dimension(function(d) {
            var time = d3.time.format('%Y%m%d').parse(d.time);
            var group = d.group.split(':')[0];
            return [group, time];
          });

          var laneClimaxGroup = laneTimeDimension.group().reduce(
            function(p, v) {
              p.climax = p.climax + v.climax;

              var actor0 = v.actors['pb/A0'];
              if (actor0 === undefined || actor0 === '') {
                actor0 = 'unknown';
              }
              var parts = actor0[0].split('/');
              var actor0Name = parts[parts.length-1];
              if (p.actors[actor0Name] === undefined) {
                p.actors[actor0Name] = v.climax;
              } else {
                p.actors[actor0Name] = p.actors[actor0Name] + v.climax;
              }

              v.labels.forEach(function(l) {
                if (p.labels[l] === undefined) {
                  p.labels[l] = v.climax;
                } else {
                  p.labels[l] = p.labels[l] + v.climax;
                }
              });

              return p;
            },
            function(p, v) {
              p.climax = p.climax - v.climax;

              var actor0 = v.actors['pb/A0'];
              if (actor0 === undefined || actor0 === '') {
                actor0 = 'unknown';
              }
              var parts = actor0[0].split('/');
              var actor0Name = parts[parts.length-1];
              if (p.actors[actor0Name] === undefined) {
                p.actors[actor0Name] = -v.climax;
              } else {
                p.actors[actor0Name] = p.actors[actor0Name] - v.climax;
              }

              v.labels.forEach(function(l) {
                if (p.labels[l] === undefined) {
                  p.labels[l] = -v.climax;
                } else {
                  p.labels[l] = p.labels[l] - v.climax;
                }
              });

              return p;
            },
            function() {
              return {climax: 0, actors: {}, labels: {}};
            }
          );

          customBubbleChart
            .width(1400)
            .height(500)
            .margins({
              top: 10,
              right: 50,
              bottom: 30,
              left: 40
            })
            .dimension(laneTimeDimension)
            .group(laneClimaxGroup)
            .transitionDuration(1500)
            .colors(colorbrewer.RdYlGn[9])
            .calculateColorDomain()
            // .linearColors([0, 140])
            .colorDomain([0, 140])
            .colorAccessor(function(d) {
              return d.value.climax;
            })
            .keyAccessor(function(p) {
              return p.key[1];
            })
            .valueAccessor(function(p) {
              return p.key[0];
            })
            .radiusValueAccessor(function(p) {
              return p.value.climax;
            })
            .minRadius(2)
            .maxBubbleRelativeSize(0.015)
            .x(d3.time.scale().domain([minDate, maxDate]))
            .y(d3.scale.ordinal().domain((function() {
              var domain = laneClimaxGroup.all().map(function(d) {
                return(d.key[0]);
              });
              return domain;
            })()))
            .r(d3.scale.linear().domain([0, 140]))
            // .elasticY(true)
            // .yAxisPadding(100)
            .elasticX(true)
            // .xAxisPadding(500)
            // .renderHorizontalGridLines(true)
            // .renderVerticalGridLines(true)
            .renderLabel(true)
            .renderTitle(true)
            .turnOnControls(true)
            .minRadiusWithLabel(0)
            .label(function(p) {
              var mostImportantLabel;
              var climaxScoreOfMostImportantLabel = -1;
              var labels = Object.keys(p.value.labels);
              labels.forEach(function(l) {
                if (p.value.labels[l] > climaxScoreOfMostImportantLabel) {
                  mostImportantLabel = l;
                  climaxScoreOfMostImportantLabel = p.value.labels[l];
                }
              });
              return mostImportantLabel.toString(); //p.key;
            })
            .title(function(p) {
              var mostImportantActor = '';
              var climaxScoreOfMostImportantActor = -1;
              var actors = Object.keys(p.value.actors);
              actors.forEach(function(a) {
                if (p.value.actors[a] > climaxScoreOfMostImportantActor) {
                  mostImportantActor = a;
                  climaxScoreOfMostImportantActor = p.value.actors[a];
                }
              });

              var labels = Object.keys(p.value.labels);
              var labelString = '';
              labels.forEach(function(l) {
                labelString += p.value.labels[l] + ' : ' + l.toString() + '\n';
              });
              // p.value.labels.forEach(function(d) {
              //   labelString += d.climax + ' : ' + d.labels.toString() + '\n';
              // });
              return p.key[1] + '\n' + 'Group:'+ p.key[0] + '\n' + labelString +  mostImportantActor + '\n' + 'Climax: ' + p.value.climax;
            })
            .xAxisLabel('time')
            .yAxisLabel('group');
            // .yAxis().tickFormat(function(v) {
            //   return v;
            // })
            //

          dc.override(customBubbleChart, 'xAxisMin', function() {
            // var min = d3.min(customBubbleChart.data(), function (e) {
            //   return customBubbleChart.keyAccessor()(e);
            // });
            // return dc.utils.subtract(min, customBubbleChart.xAxisPadding());
            return minDate;
          });

          dc.override(customBubbleChart, 'xAxisMax', function() {
            // var max = d3.max(customBubbleChart.data(), function (e) {
            //   return customBubbleChart.keyAccessor()(e);
            // });
            // return dc.utils.add(max, customBubbleChart.xAxisPadding());
            return maxDate;
          });

          dc.override(customBubbleChart, '_prepareYAxis', function(g) {
            this.__prepareYAxis(g);
            this.y().rangeBands([this.yAxisHeight(), 0], 0, 1);
            // this.y().ticks =
            // this._renderHorizontalGridLinesForAxis(g, this.y(), this.yAxis());
            // this.yAxis = this.yAxis().scale(this.y());
          });

          // customBubbleChart.on('renderlet', textRenderlet);

          customBubbleChart.render();
          // var laneChart = dc.laneChart('#laneChart');
          // laneChart
          //   .x(d3.time.scale().domain([new Date(1995, 0, 1), new Date(2025, 0, 1)]))
          //   .width(768)
          //   .height(480)
          //   .keyAccessor(function(d) {
          //     return d.key;
          //   })
          //   .valueAccessor(function(d) {
          //     return d.value;
          //   })
          //   .dimension(laneTimeDimension)
          //   .group(laneClimaxSumGroup);










          var timeDimension2 = ndx.dimension(function(d) {
            // var group = d.group;
            var time = d3.time.format('%Y%m%d').parse(d.time);
            // return [group, time];
            return time;
          });

          var climaxSumGroup2 = timeDimension2.group();
          // .reduceSum(function(d) {
          //   return +d.climax;
          // });

          // var symbolScale2 = d3.scale.ordinal().range(d3.svg.symbolTypes);




          // var composite = dc.customCompositeChart('#timeline2');
          //
          // composite
          //   .width(768)
          //   .height(480)
          //   .x(d3.time.scale().domain([new Date(1995, 0, 1), new Date(2025, 0, 1)]))
          //   .renderHorizontalGridLines(true)
          //
          //   .compose([
          //     dc.lineChart(composite)
          //       .dimension(timeDimension2)
          //       .group(climaxSumGroup2)
          //       .colors('navy')
          //       .dashStyle([2,2])
          //       .keyAccessor(function(d) {
          //         return d.key;
          //       })
          //       .valueAccessor(function(d) {
          //         return +d.value;
          //       }),
          //     dc.customScatterPlot(composite)
          //       .dimension(timeDimension2)
          //       .group(climaxSumGroup2)
          //       // .colors(d3.scale.category20c())
          //       // .colorAccessor(function(d, i) {
          //       //   return d.key;
          //       // })
          //       // .symbol(function(d) {
          //       //   return symbolScale2(d.key[0]);
          //       // })
          //       .symbolSize(8)
          //       .highlightedSize(10)
          //       .keyAccessor(function(d) {
          //         return d.key;
          //       })
          //       .valueAccessor(function(d) {
          //         return +d.value;
          //       })
          //     ])
          //   // .keyAccessor(function(d) {return d.key; })
          //   // .valueAccessor(function(d) {return d.value; })
          //   .elasticY(true)
          //   .brushOn(true)
          //   .clipPadding(10)
          //   .xAxisLabel('time')
          //   .yAxisLabel('climax score sum');
          // composite.render();




          var groupDimension = ndx.dimension(function(d) {
            return d.group.split(':')[0];
          });
          var countPerGroup = groupDimension.group();

          var rowChart1 = dc.rowChart('#rowchart_groups');
          rowChart1
            .x(d3.scale.linear())
            .data(function(d) {
              return d.order(function(d) {
                return d;
              }).top(20);
            })
            .ordering(function(d) {
              return -d;
            })
            .width(768)
            .height(480)
            .elasticX(true)
            .dimension(groupDimension)
            .group(countPerGroup);

          rowChart1.on('renderlet', textRenderlet);
          rowChart1.render();

          var actorA0Dimension = ndx.dimension(function(d) {
            var actor0 = d.actors['pb/A0'];
            if (actor0 === undefined || actor0 === '') {
              actor0 = 'unknown';
            }
            var parts = actor0[0].split('/');
            return parts[parts.length-1];
          });
          var countPerActorA0 = actorA0Dimension.group();

          var rowChart2 = dc.rowChart('#rowchart_firstAction');
          rowChart2
            .x(d3.scale.linear())
            .data(function(d) {
              return d.order(function(d) {
                return d;
              }).top(20);
            })
            .ordering(function(d) {
              return -d;
            })
            .width(768)
            .height(480)
            .elasticX(true)
            .dimension(actorA0Dimension)
            .group(countPerActorA0);

          rowChart2.on('renderlet', textRenderlet);
          rowChart2.render();

          var actorA1Dimension = ndx.dimension(function(d) {
            var actor0 = d.actors['pb/A1'];
            if (actor0 === undefined || actor0 === '') {
              actor0 = 'unknown';
            }
            var parts = actor0[0].split('/');
            return parts[parts.length-1];
          });
          var countPerActorA1 = actorA1Dimension.group();

          var rowChart3 = dc.rowChart('#rowchart_secondAction');
          rowChart3
            .x(d3.scale.linear())
            .data(function(d) {
              return d.order(function(d) {
                return d;
              }).top(20);
            })
            .ordering(function(d) {
              return -d;
            })
            .width(768)
            .height(480)
            .elasticX(true)
            .dimension(actorA1Dimension)
            .group(countPerActorA1);

          rowChart3.on('renderlet', textRenderlet);
          rowChart3.render();

          var idDimension = ndx.dimension(function(d) {
            return [d.group, d.time, d.labels];
          });

          var dataTable = dc.dataTable('#dataTable');
          dataTable
            .size(25)
            .width(1200)
            .dimension(idDimension)
            .group(function () {
              return '';
            }).sortBy(function(d){
              return d.time;
            })
            .order(d3.ascending)
            .columns([
              { label:'Group',
                format: function(d) {
                  return d.group;
                }
              },
              { label:'Time',
                format: function(d) {
                  return d.time;
                }
              },
              { label:'Climax Score',
                format: function(d) {
                  return d.climax;
                }
              },
              { label:'A0',
                format: function(d) {
                  return d.actors['pb/A0'];
                }
              },
              { label:'A1',
                format: function(d) {
                  return d.actors['pb/A1'];
                }
              },
              { label:'Labels',
                format: function(d) {
                  return d.labels;
                }
              }
            ]);
          dataTable.render();
          // dc.renderAll();
        }
      );
    }

    readData('data/airbus_contextual.timeline.json');
  }

  angular.module('uncertApp.punchcard').controller('PunchcardController', PunchcardController);
})();
